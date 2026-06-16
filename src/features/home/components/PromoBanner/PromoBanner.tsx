"use client";

import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";

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
        // Base container styling with prominent visual design
        "relative block w-full h-32 overflow-hidden rounded-xl",
        "bg-gradient-to-r from-orange-400 to-red-500",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-300 ease-in-out",
        // Touch feedback with active state styling
        "active:scale-[0.98] active:shadow-md",
        "touch-manipulation",
        className,
      )}
      aria-label={`Xem chi tiết khuyến mãi: ${title}`}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src={imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority
          quality={90}
          placeholder="blur"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
        {/* Gradient Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full p-4 text-white">
        <h3 className="text-lg font-bold leading-tight mb-1 drop-shadow-sm">
          {title}
        </h3>
        <p className="text-sm text-white/90 leading-snug line-clamp-2 drop-shadow-sm">
          {description}
        </p>

        {/* Visual indicator for navigation */}
        <div className="absolute top-3 right-3 opacity-75">
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
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </div>
      </div>
    </Link>
  );
};
