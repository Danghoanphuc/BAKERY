import { getCategories, getProducts } from "@/lib/db";
import {
  isCategoryVisible,
  isProductListed,
} from "@/lib/product-availability";
import type { Category, Product } from "@/types";

export type HomeData = {
  categories: Category[];
  products: Product[];
};

export async function loadHomeData(featuredProduct?: Product): Promise<HomeData> {
  const [categories, products] = await Promise.all([
    loadCategories(),
    loadProducts(),
  ]);
  const curated = products
    .filter(isProductListed)
    .sort((left, right) =>
      Number(Boolean(right.isFeatured || right.isBestseller)) -
        Number(Boolean(left.isFeatured || left.isBestseller)) ||
      (right.sortPriority ?? 0) - (left.sortPriority ?? 0),
    );

  return {
    categories,
    products: featuredProduct
      ? [featuredProduct, ...curated.filter((product) => product.id !== featuredProduct.id)]
      : curated,
  };
}

async function loadCategories() {
  try {
    const categories = await getCategories();
    return categories.filter(isCategoryVisible);
  } catch (error) {
    console.error("Error loading home categories:", error);
    return [];
  }
}

async function loadProducts() {
  try {
    return await getProducts();
  } catch (error) {
    console.error("Error loading home products:", error);
    return [];
  }
}
