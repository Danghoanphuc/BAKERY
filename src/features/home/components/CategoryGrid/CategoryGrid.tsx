"use client";

import Link from "next/link";
import { clsx } from "clsx";
import type { Category } from "@/types/category";

export interface CategoryGridProps {
  categories: Category[];
  className?: string;
}

export function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <section className={clsx("py-6", className)}>
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-3 lg:gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.id}`}
            className={clsx(
              // Base styles
              "flex flex-col items-center justify-center",
              "min-h-[64px] lg:min-h-[80px] p-3 lg:p-4 rounded-lg",
              "transition-all duration-150 ease-in-out",
              "bg-white border border-neutral-200",
              // Touch feedback
              "active:scale-95 active:bg-gray-50",
              "hover:bg-gray-50 hover:shadow-sm hover:border-primary-300",
              // Ensure minimum touch target of 48px
              "min-w-[48px] min-h-[48px]",
            )}
          >
            {/* Category Icon */}
            <div className="w-8 h-8 lg:w-10 lg:h-10 mb-2 flex items-center justify-center text-2xl lg:text-3xl">
              {category.iconUrl}
            </div>

            {/* Category Label */}
            <span
              className={clsx(
                "text-xs lg:text-sm font-medium text-center text-gray-700",
                "leading-tight overflow-hidden",
                "h-8 lg:h-10 flex items-center",
              )}
            >
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
