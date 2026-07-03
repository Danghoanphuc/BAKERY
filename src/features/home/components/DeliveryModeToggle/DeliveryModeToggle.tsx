"use client";

import { useOrderConfigStore } from "@/store/orderConfigStore";
import { clsx } from "clsx";
import { Bike, Store } from "lucide-react";

interface DeliveryModeToggleProps {
  className?: string;
}

export const DeliveryModeToggle = ({ className }: DeliveryModeToggleProps) => {
  const { config, setDeliveryMode } = useOrderConfigStore();
  const { deliveryMode } = config;

  return (
    <div
      className={clsx(
        "relative flex w-full rounded-xl bg-neutral-100 p-1.5 min-h-[46px] border border-neutral-200/60 shadow-inner",
        className,
      )}
    >
      {/* Khối trắng trượt làm nền highlight */}
      <div
        className={clsx(
          "absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-lg bg-white shadow-sm transition-transform duration-250 ease-out",
          deliveryMode === "pickup" && "translate-x-full",
        )}
      />

      {/* Option 1: Giao hàng */}
      <button
        type="button"
        onClick={() => setDeliveryMode("delivery")}
        className={clsx(
          "relative z-10 flex-1 flex items-center justify-center gap-2 rounded-lg text-xs transition-colors duration-200 select-none",
          deliveryMode === "delivery"
            ? "text-[#00B14F] font-bold"
            : "text-neutral-500 font-medium hover:text-neutral-800",
        )}
        aria-pressed={deliveryMode === "delivery"}
      >
        <Bike className="w-4 h-4" />
        <span>Giao tận nơi</span>
      </button>

      {/* Option 2: Đến lấy */}
      <button
        type="button"
        onClick={() => setDeliveryMode("pickup")}
        className={clsx(
          "relative z-10 flex-1 flex items-center justify-center gap-2 rounded-lg text-xs transition-colors duration-200 select-none",
          deliveryMode === "pickup"
            ? "text-[#00B14F] font-bold"
            : "text-neutral-500 font-medium hover:text-neutral-800",
        )}
        aria-pressed={deliveryMode === "pickup"}
      >
        <Store className="w-4 h-4" />
        <span>Đến cửa hàng lấy</span>
      </button>
    </div>
  );
};
