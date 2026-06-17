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
      <h2 className="text-lg lg:text-xl font-semibold text-neutral-900 mb-4 px-4 lg:px-6">
        {title}
      </h2>

      {/* Mobile: Horizontally Scrollable | Desktop: Grid */}
      <div className="lg:hidden overflow-x-auto">
        <div
          className="flex gap-4 px-4 pb-2"
          style={{
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

      {/* Desktop: Grid Layout */}
      <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-6 px-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

      {/* Custom scrollbar hiding for mobile */}
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
