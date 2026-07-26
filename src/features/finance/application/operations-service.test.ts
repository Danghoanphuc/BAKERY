import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  getIngredients: vi.fn(),
  getRecipe: vi.fn(),
  persistPurchase: vi.fn(),
  persistBatch: vi.fn(),
}));

vi.mock("../infrastructure/firestore-finance-repository", () => ({
  financeRepository: { record: mocks.audit },
}));

vi.mock("../infrastructure/firestore-costing-repository", () => ({
  getFinanceIngredients: mocks.getIngredients,
  getRecipeVersionById: mocks.getRecipe,
}));

vi.mock("../infrastructure/firestore-operations-repository", () => ({
  getInventoryBalances: vi.fn(),
  getInventoryMovements: vi.fn(),
  getProductionBatches: vi.fn(),
  getPurchaseReceipts: vi.fn(),
  getWasteRecords: vi.fn(),
  persistCompletedProductionBatch: mocks.persistBatch,
  persistInventoryAdjustment: vi.fn(),
  persistProductSale: vi.fn(),
  persistPurchaseReceipt: mocks.persistPurchase,
  persistWaste: vi.fn(),
}));

import {
  completeProductionBatch,
  receiveIngredientPurchase,
} from "./operations-service";

describe("finance operations service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIngredients.mockResolvedValue([
      {
        id: "flour",
        code: "NL-BOT-0001",
        name: "Bột",
        baseUnit: "gram",
        costPerBaseUnitMicros: 20_000_000,
        isActive: true,
      },
    ]);
  });

  it("normalizes purchase units before inventory persistence", async () => {
    mocks.persistPurchase.mockImplementation(async (input) => ({
      ...input,
      id: "receipt",
      totalAmount: 40_000,
    }));

    await receiveIngredientPurchase({
      idempotencyKey: "purchase:stable",
      locationId: "main",
      lines: [{
        ingredientId: "flour",
        purchaseQuantity: 2,
        purchaseUnit: "kilogram",
        lineAmount: 40_000,
      }],
      occurredAt: new Date(),
      actor: "owner",
    });

    expect(mocks.persistPurchase).toHaveBeenCalledWith(expect.objectContaining({
      lines: [{
        ingredientId: "flour",
        quantity: 2_000,
        purchaseQuantity: 2,
        purchaseUnit: "kilogram",
        lineAmount: 40_000,
      }],
    }));
  });

  it("rejects unavailable ingredients before touching inventory", async () => {
    mocks.getIngredients.mockResolvedValue([]);
    await expect(receiveIngredientPurchase({
      idempotencyKey: "purchase:stable",
      locationId: "main",
      lines: [{
        ingredientId: "missing",
        purchaseQuantity: 1,
        purchaseUnit: "kilogram",
        lineAmount: 10_000,
      }],
      occurredAt: new Date(),
      actor: "owner",
    })).rejects.toThrow("INGREDIENT_NOT_AVAILABLE");
    expect(mocks.persistPurchase).not.toHaveBeenCalled();
  });

  it("requires production usage to cover the complete active BOM", async () => {
    mocks.getRecipe.mockResolvedValue({
      id: "recipe",
      productId: "cake",
      version: 1,
      status: "active",
      effectiveFrom: new Date(),
      yieldQuantity: 10,
      ingredients: [
        { ingredientId: "flour", quantity: 1_000 },
        { ingredientId: "sugar", quantity: 300 },
      ],
      packagingCostPerBatch: 0,
      directLaborCostPerBatch: 0,
      overheadCostPerBatch: 0,
      wasteBasisPoints: 0,
    });

    await expect(completeProductionBatch({
      idempotencyKey: "batch:stable",
      productId: "cake",
      recipeVersionId: "recipe",
      locationId: "main",
      plannedQuantity: 10,
      actualGoodQuantity: 10,
      damagedQuantity: 0,
      ingredientUsages: [{ ingredientId: "flour", actualQuantity: 1_000 }],
      packagingCost: 0,
      directLaborCost: 0,
      overheadCost: 0,
      occurredAt: new Date(),
      actor: "owner",
    })).rejects.toThrow("INVALID_PRODUCTION_BATCH");
    expect(mocks.persistBatch).not.toHaveBeenCalled();
  });
});
