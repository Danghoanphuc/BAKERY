"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CakeSlice,
  Minus,
  Plus,
  ShoppingBag,
  TicketPercent,
  Trash2,
} from "lucide-react";

import { CustomerVoucherPicker } from "@/features/vouchers";
import { AddressModal } from "@/components/layout/Header/AddressModal";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { formatPrice } from "@/lib/utils";
import { getShippingBenefit } from "@/lib/order-pricing";
import {
  getCartItemFlavorLabel,
  getCartItemSizeLabel,
  type CartItem,
} from "@/types";

type DiscountLine = {
  id: string;
  name: string;
  amount: number;
};

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    totalQuantity,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();
  const { config } = useOrderConfigStore();
  const { selectedVoucher, clearSelectedVoucher } = useVoucherStore();
  const [isVoucherPickerOpen, setIsVoucherPickerOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  const voucherPricing = calculateVoucherPricing(totalPrice, selectedVoucher);
  const voucherAllocations = getVoucherAllocations(
    items,
    voucherPricing.discountAmount,
  );
  const discountLines = items
    .map((item) => ({
      id: item.cartItemId,
      name: item.productName,
      amount: voucherAllocations.get(item.cartItemId) ?? 0,
    }))
    .filter((line) => line.amount > 0);

  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    updateQuantity(cartItemId, newQuantity);
  };

  if (totalQuantity === 0) {
    return (
      <main className="brand-page">
        <div className="brand-shell flex min-h-screen flex-col pb-32 pt-5 md:pb-16">
          <CartHeader title="Giỏ hàng" onBack={() => router.back()} />

          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-2xl bg-teal-soft text-teal">
              <ShoppingBag className="h-11 w-11" />
            </div>
            <h1 className="brand-heading mt-5 text-2xl">
              Giỏ hàng trống
            </h1>
            <p className="mt-2 max-w-[280px] text-[14px] leading-6 text-text-muted">
              Chọn vài món bánh yêu thích rồi quay lại đây để đặt hàng nhé.
            </p>
            <Link
              href="/"
              className="brand-button-primary mt-6"
            >
              Tiếp tục mua sắm
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="brand-page">
      <div className="brand-shell min-h-screen pb-36 pt-5 md:pb-16">
        <CartHeader
          title={`Giỏ hàng (${totalQuantity})`}
          onBack={() => router.back()}
          action={
            <button
              type="button"
              onClick={clearCart}
              className="grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-brand-500 shadow-sm transition active:scale-95"
              aria-label="Xóa tất cả"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          }
        />

        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <section className="space-y-3">
          {items.map((item) => {
            const itemSubtotal = item.price * item.quantity;
            const itemDiscount = voucherAllocations.get(item.cartItemId) ?? 0;
            const itemTotalAfterDiscount = Math.max(
              0,
              itemSubtotal - itemDiscount,
            );

            return (
              <article
                key={item.cartItemId}
                className="brand-card p-3"
              >
                <div className="flex gap-3">
                  <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl bg-cream">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-[15px] font-extrabold leading-tight text-navy">
                          {item.productName}
                        </h2>
                        <CustomizationSummary item={item} />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.cartItemId)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500 transition active:scale-95"
                        aria-label="Xóa sản phẩm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-brand-500">
                          {formatPrice(item.price)}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-text-muted">
                          Thành tiền {formatPrice(itemTotalAfterDiscount)}
                        </p>
                        {itemDiscount > 0 && selectedVoucher && (
                          <p className="mt-0.5 text-[11px] font-black text-[#34802f]">
                            Tiết kiệm {formatPrice(itemDiscount)} với{" "}
                            {selectedVoucher.code}
                          </p>
                        )}
                      </div>

                      <QuantityStepper
                        quantity={item.quantity}
                        onDecrease={() =>
                          handleQuantityChange(
                            item.cartItemId,
                            item.quantity - 1,
                          )
                        }
                        onIncrease={() =>
                          handleQuantityChange(
                            item.cartItemId,
                            item.quantity + 1,
                          )
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-dashed border-sand bg-cream px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-black text-[#7a351f]">
                        {selectedVoucher
                          ? `Đang áp ${selectedVoucher.code}`
                          : "Áp voucher cho giỏ hàng"}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-[#7b6254]">
                        {selectedVoucher
                          ? voucherPricing.isEligible
                            ? "Có thể đổi hoặc bỏ mã này."
                            : voucherPricing.reason
                          : "Chọn voucher của bạn để giảm giá ngay."}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {selectedVoucher && (
                        <button
                          type="button"
                          onClick={clearSelectedVoucher}
                          className="text-[11px] font-black text-[#9b8171]"
                        >
                          Bỏ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsVoucherPickerOpen(true)}
                        className="rounded-lg bg-navy px-3 py-1.5 text-xs font-extrabold text-white"
                      >
                        {selectedVoucher ? "Đổi" : "Chọn"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <CheckoutSummary
          totalQuantity={totalQuantity}
          totalPrice={totalPrice}
          discountAmount={voucherPricing.discountAmount}
          voucherCode={selectedVoucher?.code}
          discountLines={discountLines}
          mode={config.deliveryMode}
          deliveryAddress={config.deliveryAddress?.formattedAddress || config.deliveryAddress?.street}
          onChooseAddress={() => setIsAddressModalOpen(true)}
          onCheckout={() => router.push("/checkout")}
        />
        </div>
      </div>

      <CustomerVoucherPicker
        isOpen={isVoucherPickerOpen}
        onClose={() => setIsVoucherPickerOpen(false)}
      />
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </main>
  );
}

function getVoucherAllocations(items: CartItem[], discountAmount: number) {
  const allocations = new Map<string, number>();
  if (discountAmount <= 0 || items.length === 0) return allocations;

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  if (subtotal <= 0) return allocations;

  let allocated = 0;
  items.forEach((item, index) => {
    const lineSubtotal = item.price * item.quantity;
    const amount =
      index === items.length - 1
        ? discountAmount - allocated
        : Math.min(
            lineSubtotal,
            Math.floor((discountAmount * lineSubtotal) / subtotal),
          );
    const safeAmount = Math.max(0, amount);
    allocations.set(item.cartItemId, safeAmount);
    allocated += safeAmount;
  });

  return allocations;
}

function CartHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        className="grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm transition active:scale-95"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="brand-heading min-w-0 flex-1 truncate text-center text-xl">
        {title}
      </h1>
      <div className="h-10 w-10">{action}</div>
    </header>
  );
}

function CustomizationSummary({ item }: { item: CartItem }) {
  const sizeLabel = getCartItemSizeLabel(item);
  const flavorLabel = getCartItemFlavorLabel(item);
  const details = [
    sizeLabel && `Size ${sizeLabel}`,
    flavorLabel && `Vị ${flavorLabel}`,
    item.candles ? `${item.candles} nến` : "",
    item.customMessage && `Lời chúc: ${item.customMessage}`,
  ].filter(Boolean);

  if (!details.length) {
    return (
      <p className="mt-1 text-[12px] font-medium text-text-muted">
        Tùy chọn mặc định
      </p>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {details.slice(0, 3).map((detail) => (
        <span
          key={detail}
          className="max-w-full truncate rounded-full bg-teal-soft px-2 py-0.5 text-[11px] font-semibold text-teal"
        >
          {detail}
        </span>
      ))}
    </div>
  );
}

function QuantityStepper({
  quantity,
  onDecrease,
  onIncrease,
}: {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <div className="grid h-9 grid-cols-[34px_30px_34px] items-center rounded-xl bg-cream p-0.5">
      <button
        type="button"
        onClick={onDecrease}
        className="grid h-8 w-8 place-items-center rounded-lg bg-bg-card text-charcoal shadow-sm transition active:scale-95"
        aria-label="Giảm số lượng"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="text-center text-[14px] font-black">{quantity}</span>
      <button
        type="button"
        onClick={onIncrease}
        className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-white shadow-sm transition active:scale-95"
        aria-label="Tăng số lượng"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function CheckoutSummary({
  totalQuantity,
  totalPrice,
  discountAmount,
  voucherCode,
  discountLines,
  mode,
  deliveryAddress,
  onChooseAddress,
  onCheckout,
}: {
  totalQuantity: number;
  totalPrice: number;
  discountAmount: number;
  voucherCode?: string;
  discountLines: DiscountLine[];
  mode: "delivery" | "pickup";
  deliveryAddress?: string;
  onChooseAddress: () => void;
  onCheckout: () => void;
}) {
  const isPickup = mode === "pickup";
  const deliveryFee = getShippingBenefit(totalPrice, mode).fee;
  const finalTotal = Math.max(0, totalPrice - discountAmount) + deliveryFee;

  return (
    <div
      className="mt-4 w-full lg:sticky lg:top-6 lg:mt-0"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <section className="brand-card p-4">
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between text-[13px] font-semibold text-text-muted">
            <span>Tạm tính</span>
            <span className="text-text-primary">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-[13px] font-semibold text-text-muted">
            <span>{isPickup ? "Phí nhận tại quán" : "Phí vận chuyển"}</span>
            <span className="text-[#34802f]">
              {deliveryFee === 0 ? "Miễn phí" : formatPrice(deliveryFee)}
            </span>
          </div>
          {discountAmount > 0 && (
            <div className="space-y-1.5 rounded-[14px] bg-[#eff8ea] px-3 py-2 text-[12px] font-semibold text-[#34802f]">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <TicketPercent className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Voucher {voucherCode}</span>
                </span>
              </div>
              {discountLines.map((line) => (
                <div
                  key={line.id}
                  className="flex items-center justify-between gap-3 text-[11px] text-[#3d7c37]"
                >
                  <span className="truncate">{line.name}</span>
                  <span className="shrink-0">-{formatPrice(line.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {isPickup ? (
            <div className="rounded-[14px] bg-[#fff8ec] px-3 py-2 text-[12px] font-semibold text-[#8a4a28]">
              Bạn sẽ chọn giờ nhận bánh ở bước thanh toán.
            </div>
          ) : deliveryAddress ? (
            <button type="button" onClick={onChooseAddress} className="w-full rounded-[14px] bg-[#f2faf7] px-3 py-2 text-left text-[12px] font-semibold text-[#52766f]">
              <span className="block text-[10px] font-black uppercase tracking-wide text-[#278477]">Giao đến</span>
              <span className="mt-0.5 block truncate">{deliveryAddress}</span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#fff8ec] px-3 py-2 text-[12px] font-semibold text-[#8a4a28]">
              <span className="min-w-0 flex-1">Đơn giao tận nơi cần có địa chỉ nhận bánh.</span>
              <button type="button" onClick={onChooseAddress} className="shrink-0 rounded-full bg-[#b84a39] px-3 py-2 text-[10px] font-black text-white shadow-sm">
                Nhấn vào đây để chọn vị trí
              </button>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-[#f0dfd4] pt-3">
            <span className="text-[15px] font-black">Tổng cộng</span>
            <span className="text-[22px] font-black text-brand-500">
              {formatPrice(finalTotal)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCheckout}
          className="brand-button-primary w-full"
        >
          <CakeSlice className="h-5 w-5" />
          {isPickup ? "Đặt để đến lấy" : "Đặt giao tận nơi"} ({totalQuantity}{" "}
          món)
        </button>
      </section>
    </div>
  );
}
