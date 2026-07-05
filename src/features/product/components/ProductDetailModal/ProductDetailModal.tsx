"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, TicketPercent } from "lucide-react";
import { clsx } from "clsx";

import { Modal } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { ProductShareButton } from "@/features/product/components/ProductShareButton";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import { calculateVoucherPricing } from "@/lib/vouchers";
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
  const { config } = useOrderConfigStore();
  const { selectedVoucher } = useVoucherStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizeOptions?.[0]?.id,
  );
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>(
    product.flavorOptions?.[0]?.id,
  );
  const [customMessage, setCustomMessage] = useState("");
  const [candles, setCandles] = useState<number>(0);
  const galleryImages = useMemo(
    () =>
      Array.from(
        new Set([product.imageUrl, ...(product.galleryImages ?? [])].filter(Boolean)),
      ),
    [product.galleryImages, product.imageUrl],
  );
  const [selectedImage, setSelectedImage] = useState(galleryImages[0] ?? "");

  useEffect(() => {
    setQuantity(1);
    setSelectedSize(product.sizeOptions?.[0]?.id);
    setSelectedFlavor(product.flavorOptions?.[0]?.id);
    setCustomMessage("");
    setCandles(0);
    setSelectedImage(galleryImages[0] ?? "");
  }, [galleryImages, product.id, product.sizeOptions, product.flavorOptions]);

  const finalPrice = useMemo(() => {
    let price = product.price;
    if (selectedSize && product.sizeOptions) {
      const sizeOption = product.sizeOptions.find((s) => s.id === selectedSize);
      price += sizeOption?.priceAdjustment ?? 0;
    }
    return price;
  }, [product.price, product.sizeOptions, selectedSize]);

  const totalPrice = finalPrice * quantity;
  const voucherPricing = calculateVoucherPricing(totalPrice, selectedVoucher);
  const isPickup = config.deliveryMode === "pickup";
  const isUnavailableForMode = isPickup
    ? product.availableForPickup === false
    : product.availableForDelivery === false;
  const modeLabel = isPickup ? "nhận tại quán" : "giao tận nơi";
  const unavailableMessage = isPickup
    ? "Món này hiện chỉ hỗ trợ giao tận nơi."
    : "Món này hiện chỉ hỗ trợ nhận tại quán.";

  const handleAddToCart = () => {
    if (isUnavailableForMode) return;

    onAddToCart({
      quantity,
      selectedSize,
      selectedFlavor,
      customMessage: customMessage.trim() || undefined,
      candles: candles || undefined,
    });
  };

  const formatCurrency = (price: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      className="max-h-[88vh] overflow-hidden lg:max-w-3xl"
    >
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[280px_1fr] lg:gap-5">
        <div className="shrink-0 lg:sticky lg:top-0">
          <div className="relative h-[180px] w-full overflow-hidden rounded-[18px] bg-[#fdf7f0] sm:h-[220px] lg:h-[280px]">
            <ProductImage
              src={selectedImage || product.imageUrl}
              alt={product.name}
              className="object-cover"
            />
          </div>

          {galleryImages.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {galleryImages.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  onClick={() => setSelectedImage(imageUrl)}
                  className={clsx(
                    "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-[#fdf7f0] transition",
                    selectedImage === imageUrl
                      ? "border-[#d85d6c] ring-2 ring-[#d85d6c]/20"
                      : "border-[#eadbcc]",
                  )}
                  aria-label={`Xem ảnh ${index + 1}`}
                >
                  <ProductImage
                    src={imageUrl}
                    alt={`${product.name} ${index + 1}`}
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-4">
            <h2 className="text-[21px] font-extrabold leading-tight text-[#3d2417] lg:text-2xl">
              {product.name}
            </h2>
            {product.description && (
              <p className="mt-2 text-sm leading-relaxed text-[#7b6254]">
                {product.description}
              </p>
            )}
            <p className="mt-3 text-xl font-black text-[#d85d6c]">
              {formatCurrency(finalPrice)}
            </p>
            <Link
              href="/rewards?public=1"
              className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-dashed border-[#f0c47e] bg-[#fffaf0] px-3 py-2 text-left"
            >
              <span className="flex min-w-0 items-center gap-2">
                <TicketPercent className="h-4 w-4 shrink-0 text-[#d85d6c]" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-black text-[#7a351f]">
                    {selectedVoucher
                      ? `Đang áp ${selectedVoucher.code}`
                      : "Áp voucher / mã giảm giá"}
                  </span>
                  <span className="block truncate text-[11px] font-semibold text-[#7b6254]">
                    {selectedVoucher
                      ? voucherPricing.isEligible
                        ? `Dự kiến còn ${formatCurrency(voucherPricing.totalAfterDiscount)}`
                        : voucherPricing.reason
                      : "Chọn ưu đãi trước khi thêm vào giỏ"}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs font-black text-[#d85d6c]">
                {selectedVoucher ? "Đổi" : "Chọn"}
              </span>
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-[11px] font-black",
                  isUnavailableForMode
                    ? "bg-[#fff1f0] text-[#c94f60]"
                    : "bg-[#eff8ea] text-[#34802f]",
                )}
              >
                {isUnavailableForMode
                  ? unavailableMessage
                  : isPickup
                    ? "Có thể nhận tại quán"
                    : "Có thể giao tận nơi"}
              </span>
              <ProductShareButton
                product={product}
                label="Chia se"
                className="h-8 rounded-full px-3 text-[11px]"
              />
            </div>
          </div>

          <div className="space-y-5 pb-3">
            {product.sizeOptions && product.sizeOptions.length > 0 && (
              <OptionGroup title="Chọn kích thước">
                {product.sizeOptions.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => setSelectedSize(size.id)}
                    className={optionClass(selectedSize === size.id)}
                  >
                    {size.label}
                    {size.priceAdjustment > 0 &&
                      ` +${formatCurrency(size.priceAdjustment)}`}
                  </button>
                ))}
              </OptionGroup>
            )}

            {product.flavorOptions && product.flavorOptions.length > 0 && (
              <OptionGroup title="Chọn hương vị / cốt bánh">
                {product.flavorOptions.map((flavor) => (
                  <button
                    key={flavor.id}
                    type="button"
                    onClick={() => setSelectedFlavor(flavor.id)}
                    className={optionClass(selectedFlavor === flavor.id)}
                  >
                    {flavor.label}
                  </button>
                ))}
              </OptionGroup>
            )}

            {product.requiresMessage && (
              <>
                <div>
                  <label
                    htmlFor="customMessage"
                    className="mb-2 block text-sm font-bold text-[#3d2417]"
                  >
                    Lời chúc ghi trên mặt bánh
                  </label>
                  <textarea
                    id="customMessage"
                    value={customMessage}
                    onChange={(event) => setCustomMessage(event.target.value)}
                    placeholder="Ví dụ: Chúc mừng sinh nhật"
                    rows={3}
                    maxLength={100}
                    className="w-full resize-none rounded-[14px] border border-[#eadbcc] bg-white px-3 py-2 text-sm text-[#3d2417] outline-none transition focus:border-[#d85d6c] focus:ring-2 focus:ring-[#d85d6c]/15"
                  />
                  <p className="mt-1 text-xs text-[#9b8171]">
                    {customMessage.length}/100 ký tự
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="candles"
                    className="mb-2 block text-sm font-bold text-[#3d2417]"
                  >
                    Tuổi / số lượng nến
                  </label>
                  <input
                    id="candles"
                    type="number"
                    min="0"
                    max="99"
                    value={candles || ""}
                    onChange={(event) =>
                      setCandles(parseInt(event.target.value, 10) || 0)
                    }
                    placeholder="0"
                    className="h-11 w-full rounded-[14px] border border-[#eadbcc] bg-white px-3 text-sm text-[#3d2417] outline-none transition focus:border-[#d85d6c] focus:ring-2 focus:ring-[#d85d6c]/15"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 mt-2 border-t border-[#f0e1d2] bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_22px_rgba(61,36,23,0.06)] lg:-mx-6 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-[#3d2417]">Số lượng</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#eadbcc] text-[#65483a] transition hover:bg-[#fff7f2] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Giảm số lượng"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-8 text-center text-base font-black text-[#3d2417]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#eadbcc] text-[#65483a] transition hover:bg-[#fff7f2]"
              aria-label="Tăng số lượng"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isUnavailableForMode}
          className={clsx(
            "flex h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-black text-white shadow-[0_10px_22px_rgba(216,93,108,0.25)] transition active:scale-[0.98]",
            isUnavailableForMode
              ? "cursor-not-allowed bg-[#d8c8bd] shadow-none"
              : "bg-[#d85d6c] hover:bg-[#c94f60]",
          )}
        >
          <ShoppingCart className="h-4 w-4" />
          {isUnavailableForMode
            ? `Không hỗ trợ ${modeLabel}`
            : `Thêm vào giỏ - ${formatCurrency(totalPrice)}`}
        </button>
      </div>
    </Modal>
  );
};

function OptionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-[#3d2417]">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function optionClass(active: boolean) {
  return clsx(
    "rounded-full border px-4 py-2 text-sm font-bold transition",
    active
      ? "border-[#d85d6c] bg-[#d85d6c] text-white shadow-sm"
      : "border-[#eadbcc] bg-[#fffaf6] text-[#65483a] hover:border-[#d85d6c]/50",
  );
}
