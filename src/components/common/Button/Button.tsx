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
        "touch-target px-6 rounded-lg font-medium transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        // Variant styles
        variant === "primary" && [
          "bg-primary-500 text-white",
          "hover:bg-primary-600 active:bg-primary-700",
          "disabled:hover:bg-primary-500",
        ],
        variant === "outline" && [
          "border-2 border-primary-500 text-primary-500 bg-transparent",
          "hover:bg-primary-50 active:bg-primary-100",
          "disabled:hover:bg-transparent",
        ],
        variant === "text" && [
          "text-primary-500 bg-transparent",
          "hover:bg-primary-50 active:bg-primary-100",
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
