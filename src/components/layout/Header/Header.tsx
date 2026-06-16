"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { OrderTimingModal } from "./OrderTimingModal";
import { AddressModal } from "./AddressModal";

export interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const { config } = useOrderConfigStore();
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Format timing display text
  const getTimingText = () => {
    if (config.orderTiming.type === "now") {
      return "Giao ngay";
    }

    if (config.orderTiming.scheduledDate && config.orderTiming.scheduledTime) {
      // Format scheduled time display
      const date = new Date(config.orderTiming.scheduledDate);
      const timeStr = config.orderTiming.scheduledTime;

      // Check if scheduled date is today
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();

      if (isToday) {
        return `Hôm nay, ${timeStr}`;
      }

      // Format date display (dd/mm)
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      return `${day}/${month}, ${timeStr}`;
    }

    return "Đặt trước";
  };

  // Format address display text
  const getAddressText = () => {
    if (!config.deliveryAddress) {
      return "Chọn địa chỉ giao hàng";
    }

    const { street, district } = config.deliveryAddress;
    return `${street}, ${district}`;
  };

  const handleTimingClick = () => {
    setIsTimingModalOpen(true);
  };

  const handleAddressClick = () => {
    setIsAddressModalOpen(true);
  };

  return (
    <>
      <header
        className={clsx(
          // Fixed positioning and z-index
          "fixed top-0 left-0 right-0 z-40",
          // Height and layout
          "h-14 flex items-center px-4",
          // Background with backdrop blur
          "bg-white/90 backdrop-blur-md",
          // Border
          "border-b border-neutral-200",
          // Safe area for iOS devices
          "pt-safe-area-inset-top",
          className,
        )}
      >
        <div className="flex-1 flex items-center justify-between">
          {/* Order Timing Section */}
          <button
            onClick={handleTimingClick}
            className={clsx(
              "flex items-center space-x-2 min-h-[48px] px-3 py-2",
              "text-left rounded-lg transition-colors",
              "hover:bg-neutral-100 active:bg-neutral-200",
              "touch-target",
            )}
            aria-label={`Thời gian giao hàng: ${getTimingText()}`}
          >
            {/* Clock Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="w-5 h-5 text-primary-500 flex-shrink-0"
            >
              <path
                d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M10 6V10L13 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-neutral-900">
                {getTimingText()}
              </span>
            </div>
            {/* Chevron Down */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="w-4 h-4 text-neutral-500 flex-shrink-0"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Delivery Address Section */}
          <button
            onClick={handleAddressClick}
            className={clsx(
              "flex items-center space-x-2 min-h-[48px] px-3 py-2 ml-2",
              "text-left rounded-lg transition-colors flex-1",
              "hover:bg-neutral-100 active:bg-neutral-200",
              "touch-target",
            )}
            aria-label={`Địa chỉ giao hàng: ${getAddressText()}`}
          >
            {/* Location Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="w-5 h-5 text-primary-500 flex-shrink-0"
            >
              <path
                d="M10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M10 10C8.5 11.5 4 15.5 4 17C4 17.5523 6.47715 18 10 18C13.5228 18 16 17.5523 16 17C16 15.5 11.5 11.5 10 10Z"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
            <div className="flex flex-col min-w-0 flex-1">
              <span
                className={clsx(
                  "text-sm font-medium truncate",
                  config.deliveryAddress
                    ? "text-neutral-900"
                    : "text-neutral-500",
                )}
              >
                {getAddressText()}
              </span>
            </div>
            {/* Chevron Down */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="w-4 h-4 text-neutral-500 flex-shrink-0"
            >
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Order Timing Modal */}
      <OrderTimingModal
        isOpen={isTimingModalOpen}
        onClose={() => setIsTimingModalOpen(false)}
      />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </>
  );
};
