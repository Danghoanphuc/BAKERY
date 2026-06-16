"use client";

import { useOrderConfigStore } from "@/store/orderConfigStore";
import { DeliveryMode } from "@/types/orderConfig";
import { clsx } from "clsx";

interface DeliveryModeToggleProps {
  className?: string;
}

export const DeliveryModeToggle = ({ className }: DeliveryModeToggleProps) => {
  const { config, setDeliveryMode } = useOrderConfigStore();
  const { deliveryMode } = config;

  const handleOptionClick = (mode: DeliveryMode) => {
    setDeliveryMode(mode);
  };

  return (
    <div
      className={clsx(
        "relative flex w-full rounded-lg bg-neutral-100 p-1",
        "min-h-[48px]",
        className,
      )}
    >
      {/* Sliding indicator */}
      <div
        className={clsx(
          "absolute top-1 bottom-1 w-1/2 rounded-md bg-white shadow-sm transition-transform duration-200 ease-in-out",
          deliveryMode === "pickup" && "translate-x-full",
        )}
      />

      {/* Delivery option */}
      <button
        type="button"
        onClick={() => handleOptionClick("delivery")}
        className={clsx(
          "relative z-10 flex-1 flex items-center justify-center rounded-md transition-colors duration-200",
          "min-h-[40px] px-4 py-2 text-sm font-medium",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          deliveryMode === "delivery"
            ? "text-primary-600 font-semibold"
            : "text-neutral-600 hover:text-neutral-800",
        )}
        aria-pressed={deliveryMode === "delivery"}
      >
        Giao tận nơi
      </button>

      {/* Pickup option */}
      <button
        type="button"
        onClick={() => handleOptionClick("pickup")}
        className={clsx(
          "relative z-10 flex-1 flex items-center justify-center rounded-md transition-colors duration-200",
          "min-h-[40px] px-4 py-2 text-sm font-medium",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
          deliveryMode === "pickup"
            ? "text-primary-600 font-semibold"
            : "text-neutral-600 hover:text-neutral-800",
        )}
        aria-pressed={deliveryMode === "pickup"}
      >
        Đến cửa hàng lấy
      </button>
    </div>
  );
};
