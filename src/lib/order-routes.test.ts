import { describe, expect, it } from "vitest";
import { getCustomerOrderPath } from "./order-routes";

describe("customer order routes", () => {
  it("builds the paid-order detail destination safely", () => {
    expect(getCustomerOrderPath("order 123/abc")).toBe("/order/order%20123%2Fabc");
  });
});
