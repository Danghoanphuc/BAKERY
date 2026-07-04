"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CakeSlice,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";

import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { formatPrice } from "@/lib/utils";

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

  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(cartItemId);
      return;
    }

    updateQuantity(cartItemId, newQuantity);
  };

  if (totalQuantity === 0) {
    return (
      <main className="min-h-screen bg-bg-main text-text-primary">
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-4 pb-32 pt-5">
          <CartHeader title="Giỏ hàng" onBack={() => router.back()} />

          <section className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-[#fff0e9] text-[#d85d6c] shadow-inner">
              <ShoppingBag className="h-11 w-11" />
            </div>
            <h1 className="mt-5 text-[24px] font-black tracking-[0]">
              Giỏ hàng trống
            </h1>
            <p className="mt-2 max-w-[280px] text-[14px] leading-6 text-text-muted">
              Chọn vài món bánh yêu thích rồi quay lại đây để đặt hàng nhé.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-[14px] bg-[#d85d6c] px-6 text-[15px] font-black text-white shadow-[0_8px_16px_rgba(216,93,108,0.24)]"
            >
              Tiếp tục mua sắm
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-main text-text-primary">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-[linear-gradient(180deg,#fff3e5_0%,#fffdf9_45%,#fff8ef_100%)] px-4 pb-56 pt-5 shadow-[0_0_50px_rgba(96,42,12,0.06)]">
        <CartHeader
          title={`Giỏ hàng (${totalQuantity})`}
          onBack={() => router.back()}
          action={
            <button
              type="button"
              onClick={clearCart}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-[#df5a67] shadow-sm transition active:scale-95"
              aria-label="Xóa tất cả"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          }
        />

        <ModeNotice mode={config.deliveryMode} />

        <section className="mt-4 space-y-3">
          {items.map((item) => (
            <article
              key={item.cartItemId}
              className="rounded-[20px] border border-white bg-white/82 p-3 shadow-[0_10px_24px_rgba(83,38,12,0.08)]"
            >
              <div className="flex gap-3">
                <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[16px] bg-[#fff0df]">
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="line-clamp-2 text-[15px] font-black leading-tight">
                        {item.productName}
                      </h2>
                      <CustomizationSummary item={item} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.cartItemId)}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#fff1f0] text-[#df5a67] transition active:scale-95"
                      aria-label="Xóa sản phẩm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[16px] font-black text-[#d85d6c]">
                        {formatPrice(item.price)}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-text-muted">
                        Thành tiền {formatPrice(item.price * item.quantity)}
                      </p>
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
            </article>
          ))}
        </section>

        <section className="mt-4 rounded-[18px] border border-[#f4d6bd] bg-[#fff8ec] p-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#8a4a28]">
            <Sparkles className="h-4 w-4 text-accent-star" />
            Mẹo nhỏ cho đơn bánh
          </div>
          <p className="mt-1.5 text-[12px] leading-5 text-text-muted">
            Bạn có thể thêm lời chúc, chọn vị hoặc ghi chú thời gian nhận ở
            bước thanh toán.
          </p>
        </section>
      </div>

      <CheckoutSummary
        totalQuantity={totalQuantity}
        totalPrice={totalPrice}
        mode={config.deliveryMode}
        onCheckout={() => router.push("/checkout")}
      />
    </main>
  );
}

function ModeNotice({ mode }: { mode: "delivery" | "pickup" }) {
  const isPickup = mode === "pickup";

  return (
    <section className="mt-4 rounded-[18px] border border-[#f0dfcc] bg-white/82 p-3 shadow-sm">
      <p className="text-[13px] font-black text-[#3d2417]">
        {isPickup ? "Đến lấy tại quán" : "Giao tận nơi"}
      </p>
      <p className="mt-1 text-[12px] leading-5 text-text-muted">
        {isPickup
          ? "Đơn hàng sẽ không tính phí giao. Bạn chọn giờ nhận ở bước thanh toán."
          : "Đơn hàng sẽ cần địa chỉ giao bánh và có thể áp dụng freeship theo giá trị đơn."}
      </p>
    </section>
  );
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
        className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-text-primary shadow-sm transition active:scale-95"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-center text-[20px] font-black tracking-[0]">
        {title}
      </h1>
      <div className="h-10 w-10">{action}</div>
    </header>
  );
}

function CustomizationSummary({
  item,
}: {
  item: {
    selectedSize?: string;
    selectedFlavor?: string;
    customMessage?: string;
    candles?: number;
  };
}) {
  const details = [
    item.selectedSize && `Size ${item.selectedSize}`,
    item.selectedFlavor && `Vị ${item.selectedFlavor}`,
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
          className="max-w-full truncate rounded-full bg-[#fff2e2] px-2 py-0.5 text-[11px] font-semibold text-[#8a4a28]"
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
    <div className="grid h-9 grid-cols-[34px_30px_34px] items-center rounded-full bg-[#f9eedf] p-0.5">
      <button
        type="button"
        onClick={onDecrease}
        className="grid h-8 w-8 place-items-center rounded-full bg-white text-text-secondary shadow-sm transition active:scale-95"
        aria-label="Giảm số lượng"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="text-center text-[14px] font-black">{quantity}</span>
      <button
        type="button"
        onClick={onIncrease}
        className="grid h-8 w-8 place-items-center rounded-full bg-[#d85d6c] text-white shadow-sm transition active:scale-95"
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
  mode,
  onCheckout,
}: {
  totalQuantity: number;
  totalPrice: number;
  mode: "delivery" | "pickup";
  onCheckout: () => void;
}) {
  const isPickup = mode === "pickup";
  const deliveryFee = isPickup || totalPrice >= 149000 ? 0 : 20000;
  const finalTotal = totalPrice + deliveryFee;

  return (
    <div
      className="fixed bottom-[92px] left-0 right-0 z-[90] mx-auto w-full max-w-[480px] px-4 md:bottom-6"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <section className="rounded-[22px] border border-white bg-white/92 p-4 shadow-[0_14px_34px_rgba(83,38,12,0.16)] backdrop-blur-xl">
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
          <div className="rounded-[14px] bg-[#fff8ec] px-3 py-2 text-[12px] font-semibold text-[#8a4a28]">
            {isPickup
              ? "Bạn sẽ chọn giờ nhận bánh ở bước thanh toán."
              : "Đơn giao tận nơi cần có địa chỉ nhận bánh."}
          </div>
          <div className="flex items-center justify-between border-t border-[#f0dfd4] pt-3">
            <span className="text-[15px] font-black">Tổng cộng</span>
            <span className="text-[22px] font-black text-[#d85d6c]">
              {formatPrice(finalTotal)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCheckout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-[#d85d6c] text-[15px] font-black text-white shadow-[0_8px_18px_rgba(216,93,108,0.26)] transition active:scale-[0.99]"
        >
          <CakeSlice className="h-5 w-5" />
          {isPickup ? "Đặt để đến lấy" : "Đặt giao tận nơi"} ({totalQuantity} món)
        </button>
      </section>
    </div>
  );
}
