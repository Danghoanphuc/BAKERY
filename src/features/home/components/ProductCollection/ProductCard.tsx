"use client";

import React from "react";
import { clsx } from "clsx";
import { Product } from "@/types/product";
import { Button } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
}) => {
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = () => {
    onAddToCart(product);
  };

  return (
    <div className="w-[140px] lg:w-full bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Product Image */}
      <div className="relative w-full aspect-[5/4] lg:aspect-square bg-neutral-100 overflow-hidden group">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className={clsx(
            "object-cover transition-all duration-300 w-full h-full",
            "group-hover:scale-105",
          )}
        />
      </div>

      {/* Product Info */}
      <div className="p-2 lg:p-4">
        {/* Product Name */}
        <h3
          className="text-[13px] lg:text-base font-medium text-neutral-900 mb-1.5 min-h-[2.5rem] lg:min-h-[3rem] overflow-hidden"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </h3>

        {/* Price and Add Button */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-1.5">
          <span className="text-[14px] lg:text-base font-bold text-primary-600">
            {formatPrice(product.price)}
          </span>
          <Button
            variant="primary"
            className="touch-target px-2 py-1 lg:px-4 lg:py-2 text-[12px] lg:text-sm font-bold min-w-[48px] lg:min-w-[80px] h-8 lg:h-10 w-full lg:w-auto rounded-md"
            onClick={handleAddToCart}
            data-testid="add-to-cart-btn"
          >
            Thêm
          </Button>
        </div>
      </div>
    </div>
  );
};
