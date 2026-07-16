import { describe, expect, it } from "vitest";
import type { Product } from "@/types/product";
import {
  hasSellableStock,
  isCategoryVisible,
  isProductListed,
  isProductOutOfStock,
  isProductSellable,
} from "./product-availability";

describe("product availability helpers", () => {
  it("treats missing isAvailable as listed", () => {
    expect(isProductListed({})).toBe(true);
    expect(isProductListed({ isAvailable: true })).toBe(true);
    expect(isProductListed({ isAvailable: false })).toBe(false);
  });

  it("treats missing stock as sellable, explicit 0 as out of stock", () => {
    expect(hasSellableStock({})).toBe(true);
    expect(hasSellableStock({ stock: 3 })).toBe(true);
    expect(hasSellableStock({ stock: 0 })).toBe(false);
    expect(isProductOutOfStock({})).toBe(false);
    expect(isProductOutOfStock({ stock: 0 })).toBe(true);
  });

  it("combines listing + stock for sellability", () => {
    const product: Pick<Product, "isAvailable" | "stock"> = {
      isAvailable: true,
      stock: undefined,
    };
    expect(isProductSellable(product)).toBe(true);
    expect(isProductSellable({ isAvailable: false, stock: 10 })).toBe(false);
    expect(isProductSellable({ stock: 0 })).toBe(false);
  });

  it("treats missing isVisible as visible", () => {
    expect(isCategoryVisible({})).toBe(true);
    expect(isCategoryVisible({ isVisible: false })).toBe(false);
  });
});
