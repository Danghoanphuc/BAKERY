import { describe, expect, it } from "vitest";
import type { Product } from "@/types/product";
import {
  getVisibleProductsForCategory,
  productBelongsToCategory,
} from "./product-category";

const category = { id: "banh-sinh-nhat", name: "Bánh Sinh Nhật" };

describe("product category resolution", () => {
  it("matches products assigned with the category document ID", () => {
    expect(
      productBelongsToCategory({ categoryId: "banh-sinh-nhat" }, category),
    ).toBe(true);
  });

  it("matches legacy products assigned with the category name", () => {
    expect(
      productBelongsToCategory({ categoryId: "Bánh Sinh Nhật" }, category),
    ).toBe(true);
    expect(
      productBelongsToCategory(
        { categoryId: "b%C3%A1nh%20sinh%20nh%E1%BA%ADt" },
        category,
      ),
    ).toBe(true);
  });

  it("includes records missing isAvailable but excludes explicitly hidden products", () => {
    const products = [
      product("legacy", "Bánh Sinh Nhật"),
      product("active", "banh-sinh-nhat", true),
      product("hidden", "banh-sinh-nhat", false),
      product("other", "do-uong", true),
    ];

    expect(getVisibleProductsForCategory(products, category).map((item) => item.id)).toEqual([
      "legacy",
      "active",
    ]);
  });
});

function product(id: string, categoryId: string, isAvailable?: boolean): Product {
  return {
    id,
    categoryId,
    isAvailable,
    name: id,
    price: 10_000,
    imageUrl: "/product.jpg",
  };
}
