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
        "bg-white rounded-lg shadow-sm border border-neutral-200",
        "p-4",
        // Touch feedback when interactive
        onClick && [
          "cursor-pointer transition-transform duration-150 ease-out",
          "hover:shadow-md active:scale-98",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
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
