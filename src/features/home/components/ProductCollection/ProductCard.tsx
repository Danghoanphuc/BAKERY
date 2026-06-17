"use client";

import React, { useState } from "react";
import Image from "next/image";
import { clsx } from "clsx";
import { Product } from "@/types/product";
import { Button } from "@/components/common";

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

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

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  return (
    <div className="w-40 lg:w-full bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Product Image */}
      <div className="relative w-full aspect-[5/4] lg:aspect-square bg-neutral-100 overflow-hidden group">
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
          </div>
        )}

        {!imageError ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={160}
            height={128}
            className={clsx(
              "object-cover transition-all duration-300 w-full h-full",
              "group-hover:scale-105",
              imageLoading ? "opacity-0" : "opacity-100",
            )}
            sizes="(max-width: 1024px) 160px, (max-width: 1280px) 25vw, 20vw"
            loading="lazy"
            quality={85}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-100">
            <svg
              className="w-12 h-12 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-3 lg:p-4">
        {/* Product Name */}
        <h3
          className="text-sm lg:text-base font-medium text-neutral-900 mb-2 min-h-[2.5rem] lg:min-h-[3rem] overflow-hidden"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {product.name}
        </h3>

        {/* Price and Add Button */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-2">
          <span className="text-sm lg:text-base font-semibold text-primary-600">
            {formatPrice(product.price)}
          </span>

          <Button
            variant="primary"
            className="touch-target px-3 py-1 lg:px-4 lg:py-2 text-xs lg:text-sm font-medium min-w-[48px] lg:min-w-[80px] h-8 lg:h-10 w-full lg:w-auto"
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
