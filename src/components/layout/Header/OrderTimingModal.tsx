"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { Modal } from "@/components/common/Modal";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { OrderTiming, OrderTimingType } from "@/types";

export interface OrderTimingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderTimingModal: React.FC<OrderTimingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { config, setOrderTiming } = useOrderConfigStore();
  const [selectedType, setSelectedType] = useState<OrderTimingType>(
    config.orderTiming.type,
  );
  const [scheduledDate, setScheduledDate] = useState(
    config.orderTiming.scheduledDate || "",
  );
  const [scheduledTime, setScheduledTime] = useState(
    config.orderTiming.scheduledTime || "",
  );

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedType(config.orderTiming.type);
      setScheduledDate(config.orderTiming.scheduledDate || "");
      setScheduledTime(config.orderTiming.scheduledTime || "");
    }
  }, [isOpen, config.orderTiming]);

  // Get minimum date (today) in YYYY-MM-DD format
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get minimum time for today
  const getMinTime = () => {
    if (!scheduledDate) return "";

    const selectedDateObj = new Date(scheduledDate);
    const today = new Date();

    // If selected date is today, minimum time is current time + 1 hour
    if (selectedDateObj.toDateString() === today.toDateString()) {
      const minTime = new Date(today.getTime() + 60 * 60 * 1000); // Add 1 hour
      const hours = minTime.getHours().toString().padStart(2, "0");
      const minutes = minTime.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    return ""; // No minimum for future dates
  };

  const handleConfirm = () => {
    let newTiming: OrderTiming;

    if (selectedType === "now") {
      newTiming = {
        type: "now",
      };
    } else {
      // Validate scheduled timing
      if (!scheduledDate || !scheduledTime) {
        // Show validation error
        return;
      }

      newTiming = {
        type: "scheduled",
        scheduledDate,
        scheduledTime,
      };
    }

    setOrderTiming(newTiming);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    setSelectedType(config.orderTiming.type);
    setScheduledDate(config.orderTiming.scheduledDate || "");
    setScheduledTime(config.orderTiming.scheduledTime || "");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Thời gian nhận hàng">
      <div className="space-y-6">
        {/* Timing Type Selection */}
        <div className="space-y-3">
          {/* Giao ngay option */}
          <label
            className={clsx(
              "flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors",
              selectedType === "now"
                ? "border-primary-500 bg-primary-50"
                : "border-neutral-200 hover:border-neutral-300",
            )}
          >
            <input
              type="radio"
              name="timingType"
              value="now"
              checked={selectedType === "now"}
              onChange={() => setSelectedType("now")}
              className="w-5 h-5 text-primary-500 focus:ring-primary-500 focus:ring-2"
            />
            <div className="flex-1">
              <div className="font-medium text-neutral-900">Giao ngay</div>
              <div className="text-sm text-neutral-600">
                Giao hàng trong 30-45 phút
              </div>
            </div>
          </label>

          {/* Đặt trước option */}
          <label
            className={clsx(
              "flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors",
              selectedType === "scheduled"
                ? "border-primary-500 bg-primary-50"
                : "border-neutral-200 hover:border-neutral-300",
            )}
          >
            <input
              type="radio"
              name="timingType"
              value="scheduled"
              checked={selectedType === "scheduled"}
              onChange={() => setSelectedType("scheduled")}
              className="w-5 h-5 text-primary-500 focus:ring-primary-500 focus:ring-2"
            />
            <div className="flex-1">
              <div className="font-medium text-neutral-900">Đặt trước</div>
              <div className="text-sm text-neutral-600">
                Chọn thời gian cụ thể
              </div>
            </div>
          </label>
        </div>

        {/* Scheduled Date & Time Pickers */}
        {selectedType === "scheduled" && (
          <div className="space-y-4 p-4 bg-neutral-50 rounded-lg">
            <h3 className="font-medium text-neutral-900">
              Chọn ngày và giờ giao hàng
            </h3>

            {/* Date Picker */}
            <div className="space-y-2">
              <label
                htmlFor="scheduled-date"
                className="block text-sm font-medium text-neutral-700"
              >
                Ngày giao hàng
              </label>
              <input
                id="scheduled-date"
                type="date"
                value={scheduledDate}
                min={getMinDate()}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  // Reset time when date changes
                  setScheduledTime("");
                }}
                className={clsx(
                  "w-full px-3 py-3 border border-neutral-300 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                  "text-base", // Prevent zoom on iOS
                )}
                required
              />
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <label
                htmlFor="scheduled-time"
                className="block text-sm font-medium text-neutral-700"
              >
                Giờ giao hàng
              </label>
              <input
                id="scheduled-time"
                type="time"
                value={scheduledTime}
                min={getMinTime()}
                onChange={(e) => setScheduledTime(e.target.value)}
                className={clsx(
                  "w-full px-3 py-3 border border-neutral-300 rounded-lg",
                  "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                  "text-base", // Prevent zoom on iOS
                )}
                disabled={!scheduledDate}
                required
              />
              {scheduledDate && (
                <p className="text-xs text-neutral-600">
                  * Thời gian giao hàng tối thiểu 1 tiếng sau giờ hiện tại
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleCancel}
            className={clsx(
              "flex-1 px-6 py-3 border-2 border-neutral-300 rounded-lg",
              "font-medium text-neutral-700",
              "hover:bg-neutral-50 active:bg-neutral-100",
              "transition-colors min-h-[48px]",
            )}
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              selectedType === "scheduled" && (!scheduledDate || !scheduledTime)
            }
            className={clsx(
              "flex-1 px-6 py-3 rounded-lg font-medium min-h-[48px]",
              "transition-colors",
              selectedType === "scheduled" && (!scheduledDate || !scheduledTime)
                ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                : "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700",
            )}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </Modal>
  );
};
