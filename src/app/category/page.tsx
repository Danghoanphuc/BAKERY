import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { getCategories } from "@/lib/db";
import { defaultCategoryVisuals } from "@/features/home/data/homeContent";
import type { Category } from "@/types/category";

// Revalidate every 60 seconds to ensure fresh data
export const revalidate = 60;

async function loadCategories(): Promise<Category[]> {
  try {
    const categories = await getCategories();
    // Show all categories on this page, including hidden ones
    return categories;
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
    <div className="min-h-screen bg-[#fff8ea] px-4 pb-28 pt-20 text-[#5b2b14]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-[#5b2b14] shadow-sm ring-1 ring-[#efcfad] transition hover:bg-[#fffbf5]"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
          <p className="mt-4 text-sm font-medium text-[#a36a43]">
            Sweet Bakery
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Danh mục bánh
          </h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categoryCards.map((category) => {
            const originalCategory = categories.find(
              (c) => c.id === category.id,
            );
            const isHidden =
              originalCategory && originalCategory.isVisible === false;

            return (
              <Link
                key={category.id}
                href={category.href}
                className="group overflow-hidden rounded-[18px] border border-[#efcfad] bg-white shadow-[0_8px_18px_rgba(116,63,25,0.08)]"
              >
                <div className="relative aspect-[1.25] bg-[#fff1d8]">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 220px"
                    className="object-cover transition duration-300 group-hover:scale-105"
                  />
                  {isHidden && (
                    <div className="absolute right-2 top-2 rounded-full bg-neutral-900/80 px-2.5 py-1 text-[10px] font-bold text-white">
                      Ẩn
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between px-3 py-3">
                  <span className="font-bold">{category.name}</span>
                  <ChevronRight className="h-4 w-4 text-[#8a461f]" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
