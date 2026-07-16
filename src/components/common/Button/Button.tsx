import React from "react";
import { clsx } from "clsx";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "text";
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  children,
  className,
  disabled,
  ...props
}) => {
  return (
    <button
      className={clsx(
        // Base styles - minimum 48px height for touch optimization
        "touch-target rounded-xl px-6 text-sm font-extrabold transition-all active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        // Variant styles
        variant === "primary" && [
          "bg-brand-500 text-white shadow-[0_8px_18px_rgba(217,74,52,0.2)]",
          "hover:bg-brand-600 active:bg-brand-700",
          "disabled:hover:bg-brand-500",
        ],
        variant === "outline" && [
          "border border-navy text-navy bg-transparent",
          "hover:bg-navy-soft active:bg-navy-soft",
          "disabled:hover:bg-transparent",
        ],
        variant === "text" && [
          "text-brand-500 bg-transparent",
          "hover:bg-brand-50 active:bg-brand-100",
          "disabled:hover:bg-transparent",
        ],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
