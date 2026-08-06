import { describe, expect, it } from "vitest";
import {
  getWholesaleUnitPrice,
  validateWholesaleFinishedProductInput,
} from "./wholesale-product-offer";

const validInput = {
  source: "new",
  product: {
    name: "Bánh mì",
    baseUnit: "each",
  },
  offer: {
    wholesalePrice: 120_000,
    minimumOrderQuantity: 2,
    orderIncrement: 1,
    sellUnitLabel: "Khay 6",
    unitsPerSellUnit: 6,
    locationId: "main",
    leadTimeHours: 12,
    isAvailable: true,
    priceBreaks: [{ minQuantity: 10, unitPrice: 110_000 }],
    eligibleDealerTypes: ["cafe"],
    eligibleDealerTiers: ["gold"],
    deliveryAreas: ["Quận 1"],
  },
};

describe("wholesale product offer", () => {
  it("normalizes and accepts a valid active offer", () => {
    expect(validateWholesaleFinishedProductInput(validInput)).toMatchObject({
      ok: true,
      value: {
        offer: {
          minimumOrderQuantity: 2,
          unitsPerSellUnit: 6,
        },
      },
    });
  });

  it("rejects activation without a wholesale price", () => {
    expect(validateWholesaleFinishedProductInput({
      ...validInput,
      offer: { ...validInput.offer, wholesalePrice: 0 },
    })).toEqual({
      ok: false,
      error: "Cần nhập giá sỉ trước khi kích hoạt mở bán.",
    });
  });

  it("selects the best matching quantity price", () => {
    expect(getWholesaleUnitPrice(
      120_000,
      [
        { minQuantity: 5, unitPrice: 115_000 },
        { minQuantity: 10, unitPrice: 108_000 },
      ],
      12,
    )).toBe(108_000);
  });
});
