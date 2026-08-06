import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  audit: vi.fn(),
  getIngredients: vi.fn(),
  getRecipe: vi.fn(),
  persistBatch: vi.fn(),
  persistPurchase: vi.fn(),
  persistSale: vi.fn(),
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
  persistProductSale: mocks.persistSale,
  persistPurchaseReceipt: mocks.persistPurchase,
  persistWaste: vi.fn(),
}));

import {
  completeProductionBatch,
  receiveIngredientPurchase,
  recordProductSaleInventory,
} from "./operations-service";

describe("wholesale purchase receiving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getIngredients.mockResolvedValue([{
      id: "flour",
      code: "NL-BOT-0001",
      name: "Bột mì",
      baseUnit: "gram",
      purchaseUnit: "bao",
      purchasePackQuantity: 40_000,
      referencePurchasePrice: 600_000,
      costPerBaseUnitMicros: 15_000_000,
      isActive: true,
    }]);
    mocks.persistPurchase.mockImplementation(async (input) => ({
      ...input,
      id: "receipt",
      totalAmount: 1_200_000,
    }));
  });

  it("keeps package metadata while normalizing two 40kg bags to grams", async () => {
    await receiveIngredientPurchase({
      idempotencyKey: "purchase:flour",
      locationId: "main",
      lines: [{
        ingredientId: "flour",
        purchaseQuantity: 80_000,
        purchaseUnit: "gram",
        purchaseUnitLabel: "bao",
        purchasePackQuantity: 40_000,
        purchasePackCount: 2,
        lineAmount: 1_200_000,
      }],
      occurredAt: new Date(),
      actor: "owner",
    });

    expect(mocks.persistPurchase).toHaveBeenCalledWith(expect.objectContaining({
      lines: [{
        ingredientId: "flour",
        quantity: 80_000,
        purchaseQuantity: 80_000,
        purchaseUnit: "gram",
        purchaseUnitLabel: "bao",
        purchasePackQuantity: 40_000,
        purchasePackCount: 2,
        lineAmount: 1_200_000,
      }],
    }));
  });

  it("rejects package metadata that does not match the normalized quantity", async () => {
    await expect(receiveIngredientPurchase({
      idempotencyKey: "purchase:flour",
      locationId: "main",
      lines: [{
        ingredientId: "flour",
        purchaseQuantity: 40_000,
        purchaseUnit: "gram",
        purchaseUnitLabel: "bao",
        purchasePackQuantity: 40_000,
        purchasePackCount: 2,
        lineAmount: 1_200_000,
      }],
      occurredAt: new Date(),
      actor: "owner",
    })).rejects.toThrow("INVALID_PURCHASE_RECEIPT");

    expect(mocks.persistPurchase).not.toHaveBeenCalled();
  });

  it("converts wholesale selling units to base inventory quantity", async () => {
    mocks.persistSale.mockResolvedValue({ inventoryValue: 120_000, created: true });
    await recordProductSaleInventory({
      orderId: "order-wholesale",
      locationId: "main",
      items: [{
        productId: "cake",
        quantity: 3,
        inventoryQuantityPerUnit: 6,
      }],
      actor: "owner",
    });
    expect(mocks.persistSale).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({
        productId: "cake",
        quantity: 18,
      })],
    }));
  });

  it("accepts a semi-finished inventory component in a production batch", async () => {
    mocks.getRecipe.mockResolvedValue({
      id: "bun-v1",
      productId: "bun",
      status: "active",
      ingredients: [{
        ingredientId: "sauce",
        componentType: "semi_finished",
        quantity: 20,
      }],
    });
    mocks.persistBatch.mockImplementation(async (input) => ({
      ...input,
      id: "batch-1",
      totalActualCost: 1_300,
      actualUnitCost: 1_300,
    }));

    await completeProductionBatch({
      idempotencyKey: "batch:bun",
      productId: "bun",
      recipeVersionId: "bun-v1",
      locationId: "main",
      plannedQuantity: 1,
      actualGoodQuantity: 1,
      damagedQuantity: 0,
      ingredientUsages: [{
        ingredientId: "sauce",
        componentType: "semi_finished",
        actualQuantity: 20,
      }],
      packagingCost: 0,
      directLaborCost: 0,
      overheadCost: 0,
      occurredAt: new Date(),
      actor: "owner",
    });

    expect(mocks.persistBatch).toHaveBeenCalledWith(expect.objectContaining({
      ingredientUsages: [{
        ingredientId: "sauce",
        componentType: "semi_finished",
        actualQuantity: 20,
      }],
    }));
  });
});
