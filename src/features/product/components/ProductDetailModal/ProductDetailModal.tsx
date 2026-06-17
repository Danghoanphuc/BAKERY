"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Modal } from "@/components/common";
import { Button } from "@/components/common";
import type { Product } from "@/types";

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customization: {
    quantity: number;
    selectedSize?: string;
    selectedFlavor?: string;
    customMessage?: string;
    candles?: number;
  }) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  // Local state for customization
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizeOptions?.[0]?.id,
  );
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(
    product.flavorOptions?.[0]?.id,
  );
  const [customMessage, setCustomMessage] = useState("");
  const [candles, setCandles] = useState<number>(0);

  // Calculate final price based on selected size
  const finalPrice = useMemo(() => {
    let price = product.price;
    if (selectedSize && product.sizeOptions) {
      const sizeOption = product.sizeOptions.find((s) => s.id === selectedSize);
      if (sizeOption) {
        price += sizeOption.priceAdjustment;
      }
    }
    return price;
  }, [product.price, product.sizeOptions, selectedSize]);

  const totalPrice = finalPrice * quantity;

  const handleAddToCart = () => {
    onAddToCart({
      quantity,
      selectedSize,
      selectedFlavor,
      customMessage: customMessage.trim() || undefined,
      candles: candles || undefined,
    });
    // Reset state after adding
    setQuantity(1);
    setCustomMessage("");
    setCandles(0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col h-full">
        {/* Product Image */}
        <div className="relative w-full aspect-square bg-neutral-100 rounded-lg overflow-hidden mb-4">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 500px"
          />
        </div>

        {/* Product Info */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-neutral-900 mb-2">
            {product.name}
          </h2>
          {product.description && (
            <p className="text-sm text-neutral-600 mb-3">
              {product.description}
            </p>
          )}
          <p className="text-lg font-semibold text-primary-600">
            {formatPrice(finalPrice)}
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-6 mb-4">
          {/* Size Options */}
          {product.sizeOptions && product.sizeOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Chọn kích thước
              </label>
              <div className="flex flex-wrap gap-2">
                {product.sizeOptions.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSize(size.id)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-colors
                      ${
                        selectedSize === size.id
                          ? "bg-primary-600 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }
                    `}
                  >
                    {size.label}
                    {size.priceAdjustment > 0 &&
                      ` (+${formatPrice(size.priceAdjustment)})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Flavor Options */}
          {product.flavorOptions && product.flavorOptions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Chọn hương vị / Cốt bánh
              </label>
              <div className="flex flex-wrap gap-2">
                {product.flavorOptions.map((flavor) => (
                  <button
                    key={flavor.id}
                    type="button"
                    onClick={() => setSelectedFlavor(flavor.id)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-colors
                      ${
                        selectedFlavor === flavor.id
                          ? "bg-primary-600 text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }
                    `}
                  >
                    {flavor.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Message */}
          {product.requiresMessage && (
            <div>
              <label
                htmlFor="customMessage"
                className="block text-sm font-medium text-neutral-900 mb-2"
              >
                Lời chúc ghi trên mặt bánh
              </label>
              <textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Ví dụ: Chúc mừng sinh nhật"
                rows={3}
                maxLength={100}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                {customMessage.length}/100 ký tự
              </p>
            </div>
          )}

          {/* Candles */}
          {product.requiresMessage && (
            <div>
              <label
                htmlFor="candles"
                className="block text-sm font-medium text-neutral-900 mb-2"
              >
                Tuổi / Số lượng nến
              </label>
              <input
                id="candles"
                type="number"
                min="0"
                max="99"
                value={candles || ""}
                onChange={(e) => setCandles(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          )}
        </div>

        {/* Sticky Bottom Bar */}
        <div className="border-t border-neutral-200 pt-4 bg-white">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-neutral-900">
              Số lượng
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                -
              </button>
              <span className="text-base font-semibold text-neutral-900 min-w-[2rem] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-neutral-300 text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            variant="primary"
            className="w-full font-semibold py-3"
          >
            Thêm vào giỏ - {formatPrice(totalPrice)}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
