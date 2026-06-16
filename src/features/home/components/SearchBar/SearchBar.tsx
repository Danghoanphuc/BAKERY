"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";

export interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export const SearchBar = ({
  placeholder = "Bạn muốn tìm bánh gì hôm nay?",
  className,
}: SearchBarProps) => {
  const router = useRouter();

  const handleSearchClick = () => {
    router.push("/search");
  };

  return (
    <div
      className={clsx(
        // Base styling with minimum 48px height requirement
        "min-h-[48px] h-12 w-full",
        "flex items-center",
        "bg-white rounded-lg border border-neutral-200",
        "px-4 py-3",
        "shadow-sm",
        // Touch-optimized cursor and interaction
        "cursor-pointer touch-manipulation",
        // Visual feedback on interaction
        "hover:border-neutral-300 hover:shadow-md",
        "active:scale-[0.98] active:shadow-sm",
        "transition-all duration-150 ease-in-out",
        className,
      )}
      onClick={handleSearchClick}
      role="button"
      tabIndex={0}
      aria-label={`Tìm kiếm bánh: ${placeholder}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleSearchClick();
        }
      }}
    >
      {/* Search Icon */}
      <div className="flex-shrink-0 mr-3 text-neutral-400">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <path d="M21 21l-4.35-4.35"></path>
        </svg>
      </div>

      {/* Readonly Input Field */}
      <input
        type="text"
        className={clsx(
          "flex-1 bg-transparent",
          "text-neutral-700 placeholder:text-neutral-500",
          "text-base leading-none",
          "outline-none border-none",
          // Prevent text selection and cursor
          "pointer-events-none select-none",
        )}
        placeholder={placeholder}
        readOnly
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
};
