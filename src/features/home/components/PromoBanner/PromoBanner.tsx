"use client";

import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { ArrowRight } from "lucide-react";

export interface PromoBannerProps {
  title: string;
  description: string;
  imageUrl: string;
  href: string;
  className?: string;
}

export const PromoBanner = ({
  title,
  description,
  imageUrl,
  href,
  className,
}: PromoBannerProps) => {
  return (
    <Link
      href={href}
      className={clsx(
        "relative block w-full overflow-hidden rounded-2xl",
        "bg-gradient-to-r from-[#008B3E] via-[#00A046] to-[#00B14F]",
        "p-4 text-white shadow-sm hover:shadow-md active:scale-[0.98]",
        "transition-all duration-200 ease-out touch-manipulation",
        className,
      )}
      aria-label={`Xem chi tiết ưu đãi: ${title}`}
    >
      <div className="relative z-10 max-w-[65%] flex flex-col justify-center min-h-[72px]">
        <span className="inline-block self-start rounded bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md mb-1.5">
          Chào bạn mới
        </span>
        <h3 className="text-base font-bold leading-tight text-white drop-shadow-sm">
          {title}
        </h3>
        <p className="mt-1 text-xs font-medium text-white/90 line-clamp-2 leading-snug">
          {description}
        </p>
        <div className="mt-2.5 flex items-center gap-1 text-xs font-bold text-white">
          <span>Dùng ngay</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Asset hình ảnh đẩy về sát góc phải */}
      <div className="absolute right-0 bottom-0 top-0 w-[40%] max-w-[150px] pointer-events-none">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 150px, 200px"
          className="object-contain object-right-bottom p-2 transform hover:scale-105 transition-transform duration-300"
          priority
        />
      </div>
    </Link>
  );
};
