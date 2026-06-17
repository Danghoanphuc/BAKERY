"use client";

import React, { useEffect } from "react";
import { clsx } from "clsx";

export interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  isVisible: boolean;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "success",
  duration = 3000,
  isVisible,
  onClose,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-4 w-full max-w-sm">
      <div
        className={clsx(
          "px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium",
          "animate-slide-down transition-all duration-300 ease-out",
          {
            "bg-green-500": type === "success",
            "bg-red-500": type === "error",
            "bg-blue-500": type === "info",
          },
        )}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center justify-between">
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-3 text-white/80 hover:text-white focus:outline-none"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};
