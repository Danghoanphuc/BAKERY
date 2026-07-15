"use client";

import { Loader2, ScanFace } from "lucide-react";

type BiometricSignInButtonProps = {
  onClick: () => void | Promise<void>;
  isLoading?: boolean;
  className?: string;
};

export function BiometricSignInButton({
  onClick,
  isLoading = false,
  className = "",
}: BiometricSignInButtonProps) {
  return (
    <button
      type="button"
      aria-label="Quét Face ID hoặc vân tay"
      title="Đăng nhập bằng Face ID hoặc vân tay"
      disabled={isLoading}
      onClick={onClick}
      className={`inline-grid shrink-0 place-items-center rounded-[12px] border border-[#dfc8b9] bg-white text-[#a64a37] shadow-[0_4px_12px_rgba(83,38,12,0.08)] transition hover:border-[#c98d79] hover:bg-[#fff8f4] active:scale-95 disabled:cursor-wait disabled:opacity-60 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <ScanFace className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
      )}
    </button>
  );
}
