import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import { isProductListed } from "./product-availability";

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

export function findCategoryForProduct(
  product: Pick<Product, "categoryId">,
  categories: Array<Pick<Category, "id" | "name">>,
) {
  return categories.find((category) => productBelongsToCategory(product, category));
}

/** Map legacy name/`categoryId` values to the canonical Firestore document ID. */
export function resolveCanonicalCategoryId(
  categoryId: string | undefined,
  categories: Array<Pick<Category, "id" | "name">>,
): string | undefined {
  if (!categoryId) return undefined;

  const match = findCategoryForProduct({ categoryId }, categories);
  return match?.id ?? categoryId;
}

export function getVisibleProductsForCategory(
  products: Product[],
  category: Pick<Category, "id" | "name">,
) {
  return products.filter(
    (product) =>
      isProductListed(product) &&
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
