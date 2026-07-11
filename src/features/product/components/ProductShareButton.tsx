"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { clsx } from "clsx";

import { getProductPath } from "@/lib/product-path";
import type { Product } from "@/types";

type ProductShareButtonProps = {
  product: Pick<Product, "id" | "name" | "description" | "social">;
  label?: string;
  className?: string;
  iconOnly?: boolean;
};

export function ProductShareButton({
  product,
  label = "Chia se link",
  className,
  iconOnly = false,
}: ProductShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareProduct = async () => {
    const baseUrl =
      process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      window.location.origin;
    const url = new URL(getProductPath(product), baseUrl).toString();
    const hashtags = product.social?.hashtags?.length
      ? `\n${product.social.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}`
      : "";
    const shareText = `${product.social?.description || product.description || product.name}${hashtags}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: product.name,
          text: shareText,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Cannot share product:", error);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={shareProduct}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white text-sm font-bold text-neutral-800 transition hover:bg-neutral-50",
        iconOnly ? "h-9 w-9 p-0" : "h-11 px-5",
        className,
      )}
      aria-label={label}
      title={copied ? "Da copy link" : label}
    >
      <Share2 className="h-4 w-4" />
      {!iconOnly && <span>{copied ? "Da copy link" : label}</span>}
    </button>
  );
}
