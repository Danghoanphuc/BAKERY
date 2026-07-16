import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import {
  isProductListed,
  isProductOutOfStock,
  isProductSellable,
} from "./product-availability";
import { productBelongsToCategory } from "./product-category";

export function attachProductStatsToCategories(
  categories: Category[],
  products: Product[],
): Category[] {
  return categories.map((category) => {
    const assignedProducts = products.filter((product) =>
      productBelongsToCategory(product, category),
    );
    const activeProducts = assignedProducts.filter(isProductSellable);
    const outOfStockProducts = assignedProducts.filter(
      (product) => isProductListed(product) && isProductOutOfStock(product),
    );

    return {
      ...category,
      productCount: assignedProducts.length,
      activeProductCount: activeProducts.length,
      outOfStockProductCount: outOfStockProducts.length,
    };
  });
}
