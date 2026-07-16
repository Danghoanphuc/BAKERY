import { clsx } from "clsx";

type BrandLogoProps = {
  variant?: "mark" | "wordmark" | "reverse";
  className?: string;
  alt?: string;
};

const sources = {
  mark: "/brand/sweetime-mark.svg",
  wordmark: "/brand/sweetime-wordmark.svg",
  reverse: "/brand/sweetime-wordmark-reverse.svg",
} as const;

export function BrandLogo({ variant = "wordmark", className, alt = "SweetTime" }: BrandLogoProps) {
  return <img src={sources[variant]} alt={alt} className={clsx("block h-auto", className)} />;
}
