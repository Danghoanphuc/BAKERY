"use client";

import { ImageIcon } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";

type ProductImageProps = {
  src?: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
};

export function ProductImage({ src, alt, className, loading = "lazy" }: ProductImageProps) {
  const [hasError, setHasError] = useState(false);
  const canShowImage = Boolean(src?.trim()) && !hasError;

  if (!canShowImage) {
    return (
      <div
        className={clsx(
          "flex h-full w-full items-center justify-center bg-[#f7efe8] text-[#b99b88]",
          className,
        )}
      >
        <ImageIcon className="h-7 w-7" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={clsx("h-full w-full object-cover", className)}
    />
  );
}
