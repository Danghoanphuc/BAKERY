import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createWholesaleProduct: vi.fn(),
  deleteWholesaleRecord: vi.fn(),
  listWholesaleRecords: vi.fn(async () => []),
  updateWholesaleRecord: vi.fn(),
  addRecipeVersion: vi.fn(),
  activateRecipe: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => null,
  getAdminSession: () => ({ id: "admin-1" }),
}));
vi.mock("@/lib/wholesale-admin-store", () => ({
  createWholesaleProduct: mocks.createWholesaleProduct,
  deleteWholesaleRecord: mocks.deleteWholesaleRecord,
  listWholesaleRecords: mocks.listWholesaleRecords,
  updateWholesaleRecord: mocks.updateWholesaleRecord,
}));
vi.mock("@/lib/product-identifiers", () => ({
  createNextProductSku: () => "BTP-SAUCE",
  createProductSku: () => "BTP-SAUCE",
  ensureProductIdentifiers: (value: unknown) => value,
  getIdentifierValidationError: () => null,
}));
vi.mock("@/lib/product-item-payload", () => ({
  prepareProductItemForCreate: (value: unknown) => value,
  getProductItemValidationError: () => null,
}));
vi.mock("@/lib/workspace-card-template", () => ({
  findWorkspaceCardTemplate: () => undefined,
  mergeWorkspaceCardTemplate: (value: unknown) => value,
}));
vi.mock("@/features/wholesale-finance", () => ({
  addRecipeVersion: mocks.addRecipeVersion,
  activateRecipe: mocks.activateRecipe,
}));
vi.mock("@/features/wholesale-finance/infrastructure/firestore-costing-repository", () => ({
  upsertFinanceIngredientProjection: vi.fn(),
}));
vi.mock("@/lib/ingredient-groups", () => ({
  getIngredientGroupSelectionError: () => null,
}));
vi.mock("@/lib/wholesale-firebase/admin", () => ({
  getAdminFirestore: () => ({ collection: vi.fn() }),
}));

import { POST } from "./route";

describe("POST /api/wholesale/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWholesaleRecords.mockResolvedValue([]);
    mocks.createWholesaleProduct.mockResolvedValue({
      id: "semi-1",
      name: "Sốt bơ",
      sku: "BTP-SAUCE",
      itemType: "semi_finished",
      lifecycleStatus: "draft",
    });
    mocks.addRecipeVersion.mockResolvedValue({
      id: "recipe-1",
      productId: "semi-1",
      yieldQuantity: 10,
    });
  });

  it("creates and activates a semi-finished product and BOM as one operation", async () => {
    const response = await POST(new Request("http://localhost/api/wholesale/products", {
      method: "POST",
      body: JSON.stringify({
        name: "Sốt bơ",
        sku: "BTP-SAUCE",
        itemType: "semi_finished",
        lifecycleStatus: "draft",
        bom: {
          yieldQuantity: 10,
          ingredients: [{ ingredientId: "butter", quantity: 100 }],
          packagingCostPerBatch: 1_000,
          directLaborCostPerBatch: 2_000,
          overheadCostPerBatch: 500,
          wasteBasisPoints: 300,
          packagingCostLines: [{ id: "box", name: "Hộp", quantity: 1, unitCost: 1_000 }],
        },
      }),
    }));

    expect(response.status).toBe(201);
    expect(mocks.addRecipeVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "semi-1",
        yieldQuantity: 10,
        packagingCostLines: [{ id: "box", name: "Hộp", quantity: 1, unitCost: 1_000 }],
      }),
      "admin-1",
    );
    expect(mocks.activateRecipe).toHaveBeenCalledWith("recipe-1", "admin-1");
    expect(mocks.updateWholesaleRecord).toHaveBeenCalledWith(
      "products",
      "semi-1",
      { lifecycleStatus: "active", manufacturingOutputQuantity: 10 },
    );
    expect(await response.json()).toMatchObject({
      id: "semi-1",
      lifecycleStatus: "active",
    });
  });
});
