import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

/**
 * Supports both the current category document ID and legacy product records
 * that stored the category name in `categoryId`.
 */
export function productBelongsToCategory(
  product: Pick<Product, "categoryId">,
  category: Pick<Category, "id" | "name">,
) {
  const assignment = normalizeCategoryReference(product.categoryId);
  if (!assignment) return false;

  return (
    assignment === normalizeCategoryReference(category.id) ||
    assignment === normalizeCategoryReference(category.name)
  );
}

export function getVisibleProductsForCategory(
  products: Product[],
  category: Pick<Category, "id" | "name">,
) {
  return products.filter(
    (product) =>
      product.isAvailable !== false &&
      productBelongsToCategory(product, category),
  );
}

export function normalizeCategoryReference(value?: string) {
  if (!value) return "";

  return decodeSafely(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function decodeSafely(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
