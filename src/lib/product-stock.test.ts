import { describe, expect, it } from "vitest";
import type { Product } from "@/types/product";
import {
  applyStockDelta,
  getEffectiveStock,
  resolveStockTarget,
} from "./product-stock";

const product: Product = {
  id: "p1",
  name: "Cake",
  price: 100_000,
  imageUrl: "/cake.jpg",
  stock: 10,
  sizeOptions: [
    { id: "20", label: "20cm", priceAdjustment: 0, stock: 4 },
    { id: "24", label: "24cm", priceAdjustment: 50_000 },
  ],
  flavorOptions: [
    { id: "choco", label: "Chocolate", stock: 2 },
    { id: "vanila", label: "Vanilla" },
  ],
};

describe("product stock helpers", () => {
  it("prefers size stock over flavor and product stock", () => {
    expect(resolveStockTarget(product, "20", "choco")).toEqual({
      kind: "size",
      sizeId: "20",
    });
    expect(getEffectiveStock(product, "20", "choco")).toBe(4);
  });

  it("falls back to flavor then product stock", () => {
    expect(resolveStockTarget(product, "24", "choco")).toEqual({
      kind: "flavor",
      flavorId: "choco",
    });
    expect(getEffectiveStock(product, "24", "choco")).toBe(2);
    expect(resolveStockTarget(product, "24", "vanila")).toEqual({
      kind: "product",
    });
    expect(getEffectiveStock(product, "24", "vanila")).toBe(10);
  });

  it("decrements only one stock level", () => {
    const next = applyStockDelta(product, -1, "20", "choco");
    expect(next.sizeOptions?.find((s) => s.id === "20")?.stock).toBe(3);
    expect(next.flavorOptions?.find((f) => f.id === "choco")?.stock).toBe(2);
    expect(next.stock).toBe(10);
  });
});
