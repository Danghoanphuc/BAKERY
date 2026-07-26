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
  const normalizedSrc = src?.trim() ?? "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const canShowImage = Boolean(normalizedSrc) && failedSrc !== normalizedSrc;

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
      src={normalizedSrc}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(normalizedSrc)}
      className={clsx("h-full w-full object-cover", className)}
    />
  );
}
