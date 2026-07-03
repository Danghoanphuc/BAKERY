import { notFound } from "next/navigation";
import { getCategories, getProductsByCategory } from "@/lib/db";
import { CategoryPageClient } from "./category-page-client";

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;
  const [categories, products] = await Promise.all([
    getCategories(),
    getProductsByCategory(id),
  ]);

  const category = categories.find((c) => c.id === id);

  if (!category || !(category.isVisible ?? true)) {
    notFound();
  }

  return <CategoryPageClient category={category} products={products} />;
}
