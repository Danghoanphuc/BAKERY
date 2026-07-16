import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getCategories } from "@/lib/db";
import { isCategoryVisible } from "@/lib/product-availability";
import { defaultCategoryVisuals } from "@/features/home/data/homeContent";
import type { Category } from "@/types/category";

// Revalidate every 60 seconds to ensure fresh data
export const revalidate = 60;

async function loadCategories(): Promise<Category[]> {
  try {
    const categories = await getCategories();
    return categories.filter(isCategoryVisible);
  } catch (error) {
    console.error("Error loading categories page:", error);
    return [];
  }
}

export default async function CategoryPage() {
  const categories = await loadCategories();
  const categoryCards =
    categories.length > 0
      ? categories.map((category, index) => ({
          id: category.id,
          name: category.name,
          href: `/category/${category.id}`,
          imageUrl:
            category.iconUrl ||
            defaultCategoryVisuals[index % defaultCategoryVisuals.length]
              .imageUrl,
        }))
      : defaultCategoryVisuals.map((category) => ({
          id: category.name,
          name: category.name,
          href: category.href,
          imageUrl: category.imageUrl,
        }));

  return (
    <div className="brand-page px-4 pb-28 pt-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5">
          <Link
            href="/"
            className="brand-button-secondary mb-4 min-h-10 px-4 py-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
          <p className="brand-eyebrow mt-4">
            SweetTime Bakery
          </p>
          <h1 className="brand-heading text-2xl">
            Danh mục bánh
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categoryCards.map((category) => (
            <Link
              key={category.id}
              href={category.href}
              className="brand-card group overflow-hidden"
            >
              <div className="relative aspect-[1.25] bg-cream">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 220px"
                  className="object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-3">
                <span className="font-bold text-navy">{category.name}</span>
                <ChevronRight className="h-4 w-4 text-brand-500" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
