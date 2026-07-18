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
        "touch-target whitespace-nowrap rounded-xl px-6 text-sm font-extrabold transition-all duration-200 active:translate-y-px",
        "focus:outline-none focus-visible:ring-3 focus-visible:ring-accent-gold/45 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Variant styles
        variant === "primary" && [
          "bg-brand-500 text-white shadow-[0_8px_18px_oklch(54%_0.15_34/0.2)]",
          "hover:-translate-y-0.5 hover:bg-brand-600 active:translate-y-0 active:bg-brand-700",
          "disabled:hover:bg-brand-500",
        ],
        variant === "outline" && [
          "border border-navy bg-transparent text-navy",
          "hover:-translate-y-0.5 hover:bg-navy-soft active:translate-y-0 active:bg-navy-soft",
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
