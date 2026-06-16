"use client";

import React from "react";
import { clsx } from "clsx";
import { Product } from "@/types/product";
import { ProductCard } from "./ProductCard";

export interface ProductCollectionProps {
  title: string;
  products: Product[];
  onAddToCart: (product: Product) => void;
  className?: string;
}

export const ProductCollection: React.FC<ProductCollectionProps> = ({
  title,
  products,
  onAddToCart,
  className,
}) => {
  return (
    <section
      className={clsx("py-4", className)}
      data-testid="product-collection"
    >
      {/* Section Title */}
      <h2 className="text-lg font-semibold text-neutral-900 mb-4 px-4">
        {title}
      </h2>

      {/* Horizontally Scrollable Product Container */}
      <div className="overflow-x-auto">
        <div
          className="flex gap-4 px-4 pb-2"
          style={{
            /* CSS scroll snap for smooth snapping */
            scrollSnapType: "x mandatory",
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0"
              style={{
                scrollSnapAlign: "start",
              }}
            >
              <ProductCard product={product} onAddToCart={onAddToCart} />
            </div>
          ))}
        </div>
      </div>

      {/* Custom scrollbar hiding using Tailwind utilities */}
      <style jsx>{`
        .overflow-x-auto {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        .overflow-x-auto::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
      `}</style>
    </section>
  );
};
