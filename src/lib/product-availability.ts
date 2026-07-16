import type { Product } from "@/types/product";

/** Product is sellable unless explicitly hidden. Missing `isAvailable` = available (legacy). */
export function isProductListed(
  product: Pick<Product, "isAvailable">,
): boolean {
  return product.isAvailable !== false;
}

/** Inventory display / math. Missing stock counts as 0. */
export function getProductStockQty(product: Pick<Product, "stock">): number {
  return typeof product.stock === "number" ? product.stock : 0;
}

/**
 * Sellability stock check.
 * Untacked stock (`undefined`) stays sellable for legacy products.
 * Explicit `0` or negative = out of stock.
 */
export function hasSellableStock(product: Pick<Product, "stock">): boolean {
  return product.stock === undefined || product.stock > 0;
}

export function isProductOutOfStock(product: Pick<Product, "stock">): boolean {
  return typeof product.stock === "number" && product.stock <= 0;
}

export function isProductSellable(product: Pick<Product, "isAvailable" | "stock">): boolean {
  return isProductListed(product) && hasSellableStock(product);
}

/** Category is shown on storefront/POS unless explicitly hidden. */
export function isCategoryVisible(
  category: { isVisible?: boolean },
): boolean {
  return category.isVisible !== false;
}
