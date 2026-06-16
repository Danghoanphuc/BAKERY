"use client";

import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import type { Category } from "@/types/category";

export interface CategoryGridProps {
  categories: Category[];
  className?: string;
}

export function CategoryGrid({ categories, className }: CategoryGridProps) {
  return (
    <section className={clsx("px-4 py-6", className)}>
      <div className="grid grid-cols-4 gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/category/${category.id}`}
            className={clsx(
              // Base styles
              "flex flex-col items-center justify-center",
              "min-h-[64px] p-3 rounded-lg",
              "transition-all duration-150 ease-in-out",
              // Touch feedback
              "active:scale-95 active:bg-gray-50",
              "hover:bg-gray-50",
              // Ensure minimum touch target of 48px
              "min-w-[48px] min-h-[48px]",
            )}
          >
            {/* Category Icon */}
            <div className="w-8 h-8 mb-2 relative">
              <Image
                src={category.iconUrl}
                alt={category.name}
                width={32}
                height={32}
                className="object-contain w-full h-full"
                sizes="32px"
                loading="lazy"
                quality={90}
              />
            </div>

            {/* Category Label */}
            <span
              className={clsx(
                "text-xs font-medium text-center text-gray-700",
                "leading-tight overflow-hidden",
                // Manual line clamping for better compatibility
                "h-8 flex items-center",
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
