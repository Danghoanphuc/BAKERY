"use client";

import React from "react";
import { clsx } from "clsx";
import { Button } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { ProductShareButton } from "@/features/product/components/ProductShareButton";
import { getProductPath } from "@/lib/product-path";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { useVoucherStore } from "@/store/voucherStore";
import { Product } from "@/types/product";

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
}) => {
  const { selectedVoucher } = useVoucherStore();
  const voucherPricing = calculateVoucherPricing(product.price, selectedVoucher);

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
    <div className="w-[140px] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md lg:w-full">
      <a
        href={getProductPath(product)}
        className="group relative block aspect-[5/4] w-full overflow-hidden bg-neutral-100 lg:aspect-square"
        aria-label={`Xem ${product.name}`}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className={clsx(
            "h-full w-full object-cover transition-all duration-300",
            "group-hover:scale-105",
          )}
        />
      </a>

      <div className="p-2 lg:p-4">
        <h3
          className="mb-1.5 min-h-[2.5rem] overflow-hidden text-[13px] font-medium text-neutral-900 lg:min-h-[3rem] lg:text-base"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          <a href={getProductPath(product)}>{product.name}</a>
        </h3>

        <div className="flex flex-col items-start justify-between gap-1.5 lg:flex-row lg:items-center">
          <span className="text-[14px] font-bold text-primary-600 lg:text-base">
            {formatPrice(product.price)}
          </span>
          <div className="flex w-full items-center gap-1.5 lg:w-auto">
            <ProductShareButton
              product={product}
              iconOnly
              className="h-8 w-8 shrink-0 lg:h-10 lg:w-10"
            />
            <Button
              variant="primary"
              className="touch-target h-8 w-full min-w-[48px] rounded-md px-2 py-1 text-[12px] font-bold lg:h-10 lg:w-auto lg:min-w-[80px] lg:px-4 lg:py-2 lg:text-sm"
              onClick={handleAddToCart}
              data-testid="add-to-cart-btn"
            >
              Thêm
            </Button>
          </div>
        </div>

        <div className="mt-2 rounded-md border border-dashed border-[#f0c47e] bg-[#fffaf0] px-2 py-1.5">
          {selectedVoucher ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-[#7a351f]">
                  Voucher {selectedVoucher.code}
                </p>
                <p className="text-[10px] font-semibold text-[#7b6254]">
                  {voucherPricing.isEligible
                    ? `Còn ${formatPrice(voucherPricing.totalAfterDiscount)}`
                    : voucherPricing.reason}
                </p>
              </div>
              <a
                href="/rewards?public=1"
                className="shrink-0 text-[11px] font-black text-[#d85d6c]"
              >
                Đổi
              </a>
            </div>
          ) : (
            <a
              href="/rewards?public=1"
              className="block text-center text-[11px] font-black text-[#7a351f]"
            >
              Chọn voucher
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
