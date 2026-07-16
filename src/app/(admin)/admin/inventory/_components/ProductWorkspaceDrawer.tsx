"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ProductWorkspaceDrawerProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  header: ReactNode;
  children: ReactNode;
};

export function ProductWorkspaceDrawer({
  isOpen,
  title,
  onClose,
  header,
  children,
}: ProductWorkspaceDrawerProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const titleId = useId();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "var(--scrollbar-width, 0px)";

    const closeButton = drawerRef.current?.querySelector<HTMLElement>(
      "[data-workspace-close]",
    );
    closeButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-neutral-950/30 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Đóng bảng chỉnh sửa sản phẩm"
      />
      <aside
        ref={drawerRef}
        className="relative flex h-[100dvh] w-full max-w-[1120px] animate-in slide-in-from-right-full duration-300 ease-out md:w-[70vw] lg:w-[68vw]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="sr-only">{title}</h2>
        <div className="flex min-w-0 flex-1 flex-col border-l border-neutral-200 bg-[#fbfbfa] shadow-2xl">
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
        <button
          type="button"
          data-workspace-close
          onClick={onClose}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm transition hover:bg-neutral-100 hover:text-neutral-950"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </aside>
    </div>,
    document.body,
  );
}
