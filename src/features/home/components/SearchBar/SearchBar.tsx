"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Search } from "lucide-react";

export interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

export const SearchBar = ({
  placeholder = "Bạn đang thèm gì nào??",
  className,
}: SearchBarProps) => {
  const router = useRouter();

  return (
    <div
      className={clsx(
        "h-11 w-full flex items-center bg-white rounded-xl px-3.5 py-2.5",
        "shadow-md shadow-black/10 border border-transparent",
        "cursor-pointer touch-manipulation",
        "hover:border-neutral-200 active:scale-[0.98]",
        "transition-all duration-150 ease-out",
        className,
      )}
      onClick={() => router.push("/search")}
      role="button"
      tabIndex={0}
      aria-label={`Tìm kiếm: ${placeholder}`}
    >
      <Search className="w-5 h-5 text-neutral-600 mr-2.5 flex-shrink-0" />
      <input
        type="text"
        className="flex-1 bg-transparent text-sm font-medium text-neutral-800 placeholder:text-neutral-400 outline-none pointer-events-none select-none"
        placeholder={placeholder}
        readOnly
        tabIndex={-1}
      />
    </div>
  );
};
