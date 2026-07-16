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
      <h2 className="brand-heading mb-4 px-4 text-lg lg:px-6 lg:text-xl">
        {title}
      </h2>

      <div className="grid grid-cols-2 gap-3 px-4 lg:grid-cols-4 lg:gap-6 lg:px-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>

    </section>
  );
};
