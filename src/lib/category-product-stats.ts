import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import { productBelongsToCategory } from "./product-category";

export function attachProductStatsToCategories(
  categories: Category[],
  products: Product[],
): Category[] {
  return categories.map((category) => {
    const assignedProducts = products.filter((product) =>
      productBelongsToCategory(product, category),
    );
    const activeProducts = assignedProducts.filter(
      (product) => product.isAvailable !== false && (product.stock ?? 1) > 0,
    );
    const outOfStockProducts = assignedProducts.filter(
      (product) => product.isAvailable !== false && (product.stock ?? 1) <= 0,
    );

    return {
      ...category,
      productCount: assignedProducts.length,
      activeProductCount: activeProducts.length,
      outOfStockProductCount: outOfStockProducts.length,
    };
  });
}
