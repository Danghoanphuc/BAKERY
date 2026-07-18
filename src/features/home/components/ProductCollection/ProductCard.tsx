"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { ProductShareButton } from "@/features/product/components/ProductShareButton";
import { getProductStartingPrice } from "@/features/product/product-cart";
import { CustomerVoucherPicker } from "@/features/vouchers";
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
  const [isVoucherPickerOpen, setIsVoucherPickerOpen] = useState(false);
  const startingPrice = getProductStartingPrice(product);
  const voucherPricing = calculateVoucherPricing(startingPrice, selectedVoucher);

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
    <article className="brand-card group w-full overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_38px_oklch(27%_0.045_48/0.11)]">
      <a
        href={getProductPath(product)}
        className="relative block aspect-[4/5] w-full overflow-hidden bg-cream lg:aspect-[3/4]"
        aria-label={`Xem ${product.name}`}
      >
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className={clsx(
            "h-full w-full object-cover transition-all duration-300",
            "group-hover:scale-[1.03]",
          )}
        />
      </a>

      <div className="p-3.5 lg:p-4">
        <h3
          className="mb-2 min-h-[2.5rem] overflow-hidden text-sm font-extrabold leading-5 text-navy lg:min-h-[3rem] lg:text-base lg:leading-6"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          <a href={getProductPath(product)}>{product.name}</a>
        </h3>

        <div className="flex flex-col items-start justify-between gap-1.5 lg:flex-row lg:items-center">
          <span className="whitespace-nowrap text-sm font-black text-brand-600 lg:text-base">
            {product.sizeOptions?.length ? "Từ " : ""}{formatPrice(startingPrice)}
          </span>
          <div className="flex w-full items-center gap-1.5 lg:w-auto">
            <ProductShareButton
              product={product}
              iconOnly
              className="h-8 w-8 shrink-0 lg:h-10 lg:w-10"
            />
            <Button
              variant="primary"
              className="touch-target min-h-10 w-full min-w-[48px] rounded-xl px-2 py-1 text-xs font-extrabold leading-tight lg:w-auto lg:min-w-[96px] lg:px-4 lg:py-2 lg:text-sm"
              onClick={handleAddToCart}
              data-testid="add-to-cart-btn"
            >
              {selectedVoucher && voucherPricing.isEligible ? (
                `Thêm ${formatPrice(voucherPricing.totalAfterDiscount)}`
              ) : (
                "Thêm"
              )}
            </Button>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-dashed border-sand bg-cream px-2.5 py-2">
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
              <button
                type="button"
                onClick={() => setIsVoucherPickerOpen(true)}
                className="shrink-0 text-[11px] font-black text-[#b84a39]"
              >
                Đổi
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsVoucherPickerOpen(true)}
              className="block text-center text-[11px] font-black text-[#7a351f]"
            >
              Chọn voucher
            </button>
          )}
        </div>
      </div>

      <CustomerVoucherPicker
        isOpen={isVoucherPickerOpen}
        onClose={() => setIsVoucherPickerOpen(false)}
      />
    </article>
  );
};
