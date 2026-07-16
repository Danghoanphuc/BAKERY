"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, cn } from "@/lib/utils";

export interface StickyCartProps {
  className?: string;
}

export const StickyCart = ({ className }: StickyCartProps) => {
  const router = useRouter();
  const { totalQuantity, totalPrice } = useCartStore();

  const handleCartClick = () => {
    router.push("/cart");
  };

  // Only render when there are items in the cart
  if (totalQuantity === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 ease-out animate-slide-up",
        "border-t border-sand bg-bg-card shadow-[0_-8px_24px_rgba(18,62,102,0.1)]",
        "px-4 py-3 pb-safe-bottom",
        className,
      )}
    >
      <button
        onClick={handleCartClick}
        className={cn(
          "w-full flex items-center justify-between",
          "bg-brand-500 hover:bg-brand-600 active:bg-brand-700",
          "rounded-xl font-extrabold text-white",
          "px-4 py-3 min-h-[48px]",
          "transition-colors duration-200",
          "focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2",
        )}
        aria-label={`Xem giỏ hàng với ${totalQuantity} món, tổng ${formatPrice(totalPrice)}`}
      >
        <div className="flex items-center space-x-2">
          <div className="flex h-6 min-w-6 items-center justify-center rounded-lg bg-brand-700 px-2 py-1 text-xs font-bold">
            {totalQuantity}
          </div>
          <span className="text-sm">{totalQuantity} món</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-semibold">{formatPrice(totalPrice)}</span>
          <span className="text-sm">Xem giỏ hàng</span>
        </div>
      </button>
    </div>
  );
};
