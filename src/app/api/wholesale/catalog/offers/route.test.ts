import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => {
  const offerCreate = vi.fn();
  const offerGet = vi.fn();
  const offerDelete = vi.fn();
  const offerDoc = vi.fn(() => ({
    id: "offer-1",
    create: offerCreate,
    get: offerGet,
    delete: offerDelete,
  }));
  const offerCollection = {
    get: vi.fn(async () => ({ docs: [] })),
    doc: offerDoc,
  };
  const balanceGet = vi.fn(async () => ({ docs: [], empty: true }));
  const balanceWhere = vi.fn();
  balanceWhere.mockReturnValue({ where: balanceWhere, get: balanceGet });
  const balanceCollection = { where: balanceWhere };
  const recipeDelete = vi.fn();
  const recipeCollection = {
    doc: vi.fn(() => ({ delete: recipeDelete })),
  };
  const collection = vi.fn((name: string) => {
    if (name === "wholesale_products") return offerCollection;
    if (name === "inventory_balances") return balanceCollection;
    if (name === "finance_recipe_versions") return recipeCollection;
    throw new Error(`Unexpected collection: ${name}`);
  });
  return {
    collection,
    offerCreate,
    offerGet,
    offerDelete,
    recipeDelete,
    createWholesaleProduct: vi.fn(),
    deleteWholesaleRecord: vi.fn(),
    addRecipeVersion: vi.fn(),
    activateRecipe: vi.fn(),
    buildProductCostSummaries: vi.fn(),
  };
});

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => null,
  getAdminSession: () => ({ id: "admin-1" }),
}));

vi.mock("@/lib/wholesale-firebase/admin", () => ({
  getAdminFirestore: () => ({ collection: mocks.collection }),
}));

vi.mock("@/lib/wholesale-admin-store", () => ({
  listWholesaleRecords: vi.fn(async () => []),
  getWholesaleRecord: vi.fn(),
  createWholesaleProduct: mocks.createWholesaleProduct,
  deleteWholesaleRecord: mocks.deleteWholesaleRecord,
}));

vi.mock("@/lib/product-identifiers", () => ({
  createNextProductSku: () => "TP-CROISSANT",
  ensureProductIdentifiers: (value: unknown) => value,
  getIdentifierValidationError: () => null,
}));

vi.mock("@/features/wholesale-finance", () => ({
  addRecipeVersion: mocks.addRecipeVersion,
  activateRecipe: mocks.activateRecipe,
  buildProductCostSummaries: mocks.buildProductCostSummaries,
}));

const validPayload = {
  source: "new",
  product: {
    name: "Croissant bơ",
    sku: "TP-CROISSANT",
    baseUnit: "each",
  },
  offer: {
    wholesalePrice: 120_000,
    minimumOrderQuantity: 1,
    orderIncrement: 1,
    sellUnitLabel: "Khay 6",
    unitsPerSellUnit: 6,
    locationId: "main",
    leadTimeHours: 0,
    isAvailable: true,
    priceBreaks: [],
    eligibleDealerTypes: [],
    eligibleDealerTiers: [],
    deliveryAreas: [],
  },
  bom: {
    yieldQuantity: 20,
    ingredients: [{ ingredientId: "flour", quantity: 200 }],
    packagingCostPerBatch: 0,
    directLaborCostPerBatch: 0,
    overheadCostPerBatch: 0,
    wasteBasisPoints: 0,
  },
};

describe("POST /api/wholesale/catalog/offers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createWholesaleProduct.mockResolvedValue({
      id: "product-1",
      name: "Croissant bơ",
      sku: "TP-CROISSANT",
      itemType: "finished_good",
      stock: 0,
    });
    mocks.addRecipeVersion.mockResolvedValue({
      id: "recipe-1",
      productId: "product-1",
      version: 1,
      status: "draft",
    });
    mocks.activateRecipe.mockResolvedValue(undefined);
    mocks.buildProductCostSummaries.mockResolvedValue({
      "product-1": { productId: "product-1", totalCost: 10_000 },
    });
    mocks.offerCreate.mockResolvedValue(undefined);
    mocks.offerGet.mockResolvedValue({
      id: "offer-1",
      data: () => ({ productId: "product-1", wholesalePrice: 120_000 }),
    });
  });

  it("creates and activates the BOM before returning derived cost", async () => {
    const response = await POST(new Request("http://localhost/api/wholesale/catalog/offers", {
      method: "POST",
      body: JSON.stringify(validPayload),
    }));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.addRecipeVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "product-1",
        yieldQuantity: 20,
        ingredients: [{
          ingredientId: "flour",
          quantity: 200,
          componentType: "ingredient",
        }],
      }),
      "admin-1",
    );
    expect(mocks.activateRecipe).toHaveBeenCalledWith("recipe-1", "admin-1");
    expect(result).toMatchObject({
      product: { id: "product-1" },
      recipe: { id: "recipe-1", status: "active" },
      cost: { totalCost: 10_000 },
    });
  });

  it("rejects a new finished product without a BOM", async () => {
    const { bom: _bom, ...payloadWithoutBom } = validPayload;
    const response = await POST(new Request("http://localhost/api/wholesale/catalog/offers", {
      method: "POST",
      body: JSON.stringify(payloadWithoutBom),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Vui lòng tạo BOM cho thành phẩm.",
    });
    expect(mocks.createWholesaleProduct).not.toHaveBeenCalled();
  });
});
