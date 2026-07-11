"use client";

import React, { useEffect } from "react";
import { clsx } from "clsx";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

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

  const Icon =
    type === "success" ? CheckCircle2 : type === "error" ? CircleAlert : Info;

  return (
    <div className="fixed left-1/2 top-20 z-[160] w-full max-w-sm -translate-x-1/2 px-4">
      <div
        className={clsx(
          "relative isolate overflow-hidden rounded-[18px] border border-white/80 bg-white/[0.3] px-3.5 py-3 text-sm font-bold text-[#3d2417]",
          "shadow-[0_14px_34px_rgba(61,36,23,0.18),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[24px] backdrop-saturate-[1.7]",
          "animate-slide-down transition-all duration-300 ease-out",
        )}
        role="alert"
        aria-live="polite"
      >
        <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(145deg,rgba(255,255,255,0.62),rgba(255,255,255,0.1)_55%,rgba(184,74,57,0.08))]" />
        <div className="flex items-center gap-2.5">
          <span
            className={clsx(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
              type === "success" && "text-[#397a3d]",
              type === "error" && "text-[#b23f35]",
              type === "info" && "text-[#376d91]",
            )}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2.4} />
          </span>
          <span className="min-w-0 flex-1">{message}</span>
          <button
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/45 text-[#6b5549] transition active:scale-90"
            aria-label="Đóng thông báo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
