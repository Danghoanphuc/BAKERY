import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";

const mocks = vi.hoisted(() => ({
  getWholesaleRecord: vi.fn(),
  updateWholesaleRecord: vi.fn(),
  balanceGet: vi.fn(),
}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: () => null,
}));

vi.mock("@/lib/wholesale-admin-store", () => ({
  getWholesaleRecord: mocks.getWholesaleRecord,
  updateWholesaleRecord: mocks.updateWholesaleRecord,
}));

vi.mock("@/lib/wholesale-firebase/admin", () => {
  const where = vi.fn();
  where.mockReturnValue({ where, get: mocks.balanceGet });
  return {
    getAdminFirestore: () => ({
      collection: () => ({ where }),
    }),
  };
});

describe("PUT /api/wholesale/catalog/offers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getWholesaleRecord.mockImplementation(async (
      collection: string,
    ) => {
      if (collection === "wholesale_products") {
        return {
          id: "offer-1",
          productId: "product-1",
          productName: "Bánh bao xanh",
          wholesalePrice: 16_000,
          sellUnitLabel: "Bì 10",
          unitsPerSellUnit: 10,
          minimumOrderQuantity: 1,
          stock: 0,
          isAvailable: true,
          locationId: "main",
        };
      }
      return {
        id: "product-1",
        name: "Bánh bao xanh",
        sku: "TP-BAOXANH-01",
        itemType: "finished_good",
        price: 0,
        imageUrl: "",
        stock: 0,
      };
    });
    mocks.balanceGet.mockResolvedValue({
      empty: false,
      docs: [{
        data: () => ({ locationId: "main", quantity: 35 }),
      }],
    });
    mocks.updateWholesaleRecord.mockImplementation(async (
      _collection: string,
      id: string,
      patch: Record<string, unknown>,
    ) => ({ id, ...patch }));
  });

  it("updates wholesale fields and derives packaged stock from the ledger", async () => {
    const response = await PUT(
      new Request("http://localhost/api/wholesale/catalog/offers/offer-1", {
        method: "PUT",
        body: JSON.stringify({
          wholesalePrice: 20_000,
          sellUnitLabel: "Bì 10",
          unitsPerSellUnit: 10,
          isAvailable: true,
        }),
      }),
      { params: Promise.resolve({ id: "offer-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateWholesaleRecord).toHaveBeenCalledWith(
      "wholesale_products",
      "offer-1",
      expect.objectContaining({
        wholesalePrice: 20_000,
        sellUnitLabel: "Bì 10",
        unitsPerSellUnit: 10,
        sellUnitSku: "TP-BAOXANH-01",
        stock: 3,
      }),
    );
  });

  it("rejects an active offer without a wholesale price", async () => {
    const response = await PUT(
      new Request("http://localhost/api/wholesale/catalog/offers/offer-1", {
        method: "PUT",
        body: JSON.stringify({
          wholesalePrice: 0,
          sellUnitLabel: "Bì 10",
          unitsPerSellUnit: 10,
          isAvailable: true,
        }),
      }),
      { params: Promise.resolve({ id: "offer-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.updateWholesaleRecord).not.toHaveBeenCalled();
  });
});
