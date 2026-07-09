import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingCart, X } from "lucide-react";
import { clsx } from "clsx";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import type { Product } from "@/types";
import { formatCurrency } from "../_lib/pos-utils";

type Customization = {
  quantity: number;
  selectedSize?: string;
  selectedFlavor?: string;
  customMessage?: string;
  candles?: number;
};

type PosProductCustomizerModalProps = {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAdd: (customization: Customization) => void;
};

export function PosProductCustomizerModal({
  product,
  isOpen,
  onClose,
  onAdd,
}: PosProductCustomizerModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedFlavor, setSelectedFlavor] = useState<string | undefined>();
  const [customMessage, setCustomMessage] = useState("");
  const [candles, setCandles] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setQuantity(1);
    setSelectedSize(product.sizeOptions?.[0]?.id);
    setSelectedFlavor(product.flavorOptions?.[0]?.id);
    setCustomMessage("");
    setCandles(0);
  }, [isOpen, product]);

  const unitPrice = useMemo(() => {
    const sizeAdjustment =
      product.sizeOptions?.find((size) => size.id === selectedSize)
        ?.priceAdjustment ?? 0;
    return product.price + sizeAdjustment;
  }, [product.price, product.sizeOptions, selectedSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0e1d2] px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-[#3d2417]">
              Tuỳ chọn sản phẩm
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#9b8171]">
              {product.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full text-[#9b8171] transition hover:bg-[#fff1f0] hover:text-[#d85d6c]"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div className="aspect-square overflow-hidden rounded-2xl bg-[#fdf7f0]">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="space-y-5">
              {product.sizeOptions && product.sizeOptions.length > 0 && (
                <OptionGroup title="Kích thước">
                  {product.sizeOptions.map((size) => (
                    <OptionButton
                      key={size.id}
                      active={selectedSize === size.id}
                      onClick={() => setSelectedSize(size.id)}
                    >
                      {size.label}
                      {size.priceAdjustment > 0 &&
                        ` +${formatCurrency(size.priceAdjustment)}`}
                    </OptionButton>
                  ))}
                </OptionGroup>
              )}

              {product.flavorOptions && product.flavorOptions.length > 0 && (
                <OptionGroup title="Vị / nhân bánh">
                  {product.flavorOptions.map((flavor) => (
                    <OptionButton
                      key={flavor.id}
                      active={selectedFlavor === flavor.id}
                      onClick={() => setSelectedFlavor(flavor.id)}
                    >
                      {flavor.label}
                    </OptionButton>
                  ))}
                </OptionGroup>
              )}

              {product.requiresMessage && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-black text-[#3d2417]">
                      Lời chúc trên bánh
                    </span>
                    <textarea
                      value={customMessage}
                      onChange={(event) => setCustomMessage(event.target.value)}
                      maxLength={100}
                      rows={3}
                      placeholder="Ví dụ: Chúc mừng sinh nhật"
                      className="w-full resize-none rounded-2xl border border-[#eadbcc] bg-[#fffaf6] px-3 py-2 text-sm font-semibold text-[#3d2417] outline-none focus:border-[#d85d6c]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-black text-[#3d2417]">
                      Tuổi / số nến
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={candles || ""}
                      onChange={(event) =>
                        setCandles(Number(event.target.value) || 0)
                      }
                      className="h-11 w-full rounded-2xl border border-[#eadbcc] bg-[#fffaf6] px-3 text-sm font-semibold text-[#3d2417] outline-none focus:border-[#d85d6c]"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#f0e1d2] bg-white px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-black text-[#3d2417]">Số lượng</span>
            <div className="flex items-center gap-3">
              <QtyButton
                label="Giảm"
                disabled={quantity <= 1}
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </QtyButton>
              <span className="w-8 text-center text-base font-black text-[#3d2417]">
                {quantity}
              </span>
              <QtyButton label="Tăng" onClick={() => setQuantity(quantity + 1)}>
                <Plus className="h-4 w-4" />
              </QtyButton>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onAdd({
                quantity,
                selectedSize,
                selectedFlavor,
                customMessage: customMessage.trim() || undefined,
                candles: candles || undefined,
              })
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#d85d6c] text-sm font-black text-white shadow-[0_10px_22px_rgba(216,93,108,0.25)] transition hover:bg-[#c94f60]"
          >
            <ShoppingCart className="h-4 w-4" />
            Thêm vào giỏ - {formatCurrency(unitPrice * quantity)}
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-black text-[#3d2417]">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full border px-3 py-2 text-sm font-black transition",
        active
          ? "border-[#d85d6c] bg-[#fff1f0] text-[#d85d6c]"
          : "border-[#eadbcc] bg-white text-[#65483a] hover:border-[#d85d6c]/50",
      )}
    >
      {children}
    </button>
  );
}

function QtyButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-full border border-[#eadbcc] bg-white text-[#65483a] transition hover:bg-[#fff7f2] disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={label}
    >
      {children}
    </button>
  );
}
