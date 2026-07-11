import { describe, expect, it } from "vitest";

import type { Product } from "@/types";
import { getFulfillmentPromise, getSizePresentation } from "./product-sales";

const product: Product = {
  id: "cake",
  name: "Bánh kem",
  price: 300_000,
  imageUrl: "/cake.jpg",
  preparationTimeMinutes: 30,
};

describe("product sales presentation", () => {
  it("derives servings from legacy labels while supporting rich metadata", () => {
    expect(
      getSizePresentation(product, {
        id: "16cm",
        label: "16cm (4-6 người)",
        priceAdjustment: 50_000,
      }),
    ).toMatchObject({ title: "16cm", servings: "4-6 người", price: 350_000 });
  });

  it("builds a deterministic fulfillment promise", () => {
    const result = getFulfillmentPromise(
      product,
      "pickup",
      new Date("2026-07-11T08:00:00+07:00"),
    );
    expect(result.headline).toContain("08:30");
    expect(result.detail).toContain("30 phút");
  });
});
