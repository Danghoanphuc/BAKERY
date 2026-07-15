"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileChallengeProps = {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
  onCancel: () => void;
};

export function TurnstileChallenge({
  siteKey,
  action,
  onToken,
  onCancel,
}: TurnstileChallengeProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const reactId = useId();

  function renderWidget() {
    if (!elementRef.current || !window.turnstile || widgetRef.current) return;
    widgetRef.current = window.turnstile.render(elementRef.current, {
      sitekey: siteKey,
      action,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
      theme: "light",
    });
  }

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetRef.current && window.turnstile) {
        window.turnstile.remove(widgetRef.current);
      }
    };
  }, [action, siteKey]);

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 px-5" role="dialog" aria-modal="true" aria-labelledby={`${reactId}-title`}>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl">
        <h2 id={`${reactId}-title`} className="text-base font-black text-[#3d2417]">
          Xác minh bảo mật
        </h2>
        <p className="mt-1 text-sm text-[#80685b]">
          Bước này giúp tiệm ngăn đơn và voucher spam.
        </p>
        <div ref={elementRef} className="mt-4 flex min-h-16 justify-center" />
        <button type="button" onClick={onCancel} className="mt-3 text-sm font-bold text-[#80685b]">
          Hủy
        </button>
      </div>
    </div>
  );
}
