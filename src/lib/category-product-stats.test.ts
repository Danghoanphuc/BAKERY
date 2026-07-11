import { describe, expect, it } from "vitest";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import { attachProductStatsToCategories } from "./category-product-stats";

describe("attachProductStatsToCategories", () => {
  it("counts products assigned by category ID or legacy category name", () => {
    const categories: Category[] = [
      { id: "do-uong", name: "Đồ Uống", iconUrl: "/drink.jpg" },
    ];
    const products: Product[] = [
      product("one", "do-uong", true, 5),
      product("two", "Đồ Uống", true, 0),
      product("three", "do-uong", false, 10),
      product("other", "banh-mi", true, 5),
    ];

    expect(attachProductStatsToCategories(categories, products)[0]).toMatchObject({
      productCount: 3,
      activeProductCount: 1,
      outOfStockProductCount: 1,
    });
  });
});

function product(
  id: string,
  categoryId: string,
  isAvailable: boolean,
  stock: number,
): Product {
  return { id, categoryId, isAvailable, stock, name: id, price: 10_000, imageUrl: "/p.jpg" };
}
