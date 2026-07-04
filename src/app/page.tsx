import { BakeryHome } from "@/features/home/components";
import { getCategories, getProducts } from "@/lib/db";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";

async function loadHomeCategories(): Promise<Category[]> {
  try {
    const categories = await getCategories();
    return categories.filter((category) => category.isVisible ?? true);
  } catch (error) {
    console.error("Error loading home categories:", error);
    return [];
  }
}

async function loadFavoriteProducts(): Promise<Product[]> {
  try {
    const products = await getProducts();
    const curatedProducts = products
      .filter((product) => product.isFeatured || product.isBestseller)
      .slice(0, 8);

    return curatedProducts;
  } catch (error) {
    console.error("Error loading favorite products:", error);
    return [];
  }
}

export default async function HomePage() {
  const [categories, favoriteProducts] = await Promise.all([
    loadHomeCategories(),
    loadFavoriteProducts(),
  ]);

  return (
    <BakeryHome categories={categories} favoriteProducts={favoriteProducts} />
  );
}
