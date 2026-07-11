import { describe, expect, it } from "vitest";

import {
  FREE_SHIPPING_MINIMUM,
  STANDARD_DELIVERY_FEE,
  getShippingBenefit,
} from "./order-pricing";

describe("getShippingBenefit", () => {
  it("uses one threshold for delivery pricing", () => {
    expect(getShippingBenefit(100_000, "delivery")).toEqual({
      fee: STANDARD_DELIVERY_FEE,
      isFree: false,
      remainingForFreeShipping: FREE_SHIPPING_MINIMUM - 100_000,
    });
    expect(getShippingBenefit(FREE_SHIPPING_MINIMUM, "delivery").isFree).toBe(true);
  });

  it("never charges pickup orders", () => {
    expect(getShippingBenefit(0, "pickup")).toEqual({
      fee: 0,
      isFree: true,
      remainingForFreeShipping: 0,
    });
  });
});
