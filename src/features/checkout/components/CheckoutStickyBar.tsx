import { LockKeyhole } from "lucide-react";

import { formatPrice } from "@/lib/utils";

export function CheckoutStickyBar({
  finalTotal,
  discountAmount,
  isPickup,
  isSubmitting,
}: {
  finalTotal: number;
  discountAmount: number;
  isPickup: boolean;
  isSubmitting: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] border-t border-sand bg-bg-card/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(18,62,102,0.1)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[480px] items-center gap-3">
        <div className="min-w-0 shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-text-muted">
            Tổng cộng
          </p>
          <p className="text-lg font-black text-brand-500">
            {formatPrice(finalTotal)}
          </p>
          {discountAmount > 0 ? (
            <p className="text-[10px] font-bold text-[#34802f]">
              Đã giảm {formatPrice(discountAmount)}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(217,74,52,0.2)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-beige"
        >
          <LockKeyhole className="h-4 w-4" />
          <span className="truncate">
            {isSubmitting
              ? "Đang xử lý..."
              : isPickup
                ? "Xác nhận đến lấy"
                : "Đặt giao tận nơi"}
          </span>
        </button>
      </div>
    </div>
  );
}
