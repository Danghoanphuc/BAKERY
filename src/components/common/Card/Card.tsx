import React from "react";
import { clsx } from "clsx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  ...props
}) => {
  return (
    <div
      className={clsx(
        // Base card styles
        "rounded-[1.125rem] border border-sand bg-bg-card shadow-[0_12px_32px_oklch(27%_0.045_48/0.07)]",
        "p-4",
        // Touch feedback when interactive
        onClick && [
          "cursor-pointer transition duration-200 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_16px_38px_oklch(27%_0.045_48/0.11)] active:translate-y-0",
          "focus:outline-none focus-visible:ring-3 focus-visible:ring-accent-gold/45 focus-visible:ring-offset-2",
        ],
        className,
      )}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? "button" : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      {...props}
    >
      {children}
    </div>
  );
};
