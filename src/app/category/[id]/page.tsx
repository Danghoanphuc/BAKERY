import { notFound } from "next/navigation";
import { getAllProducts, getCategories } from "@/lib/db";
import { serializeForClient } from "@/lib/firebase/utils";
import { getVisibleProductsForCategory } from "@/lib/product-category";
import { CategoryPageClient } from "./category-page-client";

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const [categories, allProducts] = await Promise.all([
    getCategories(),
    getAllProducts(),
  ]);

  const category = categories.find((c) => c.id === id);

  if (!category || !(category.isVisible ?? true)) {
    notFound();
  }

  const products = getVisibleProductsForCategory(allProducts, category);

  return (
    <CategoryPageClient
      category={serializeForClient(category)}
      products={serializeForClient(products)}
    />
  );
}
