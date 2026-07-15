"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { clsx } from "clsx";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  expanded?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const CLOSE_DRAG_THRESHOLD = 88;

type VisibleViewport = {
  height: number;
  offsetTop: number;
  isKeyboardOpen: boolean;
};

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  contentClassName,
  expanded = false,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousScrollRef = useRef({ x: 0, y: 0 });
  const onCloseRef = useRef(onClose);
  const dragStartRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [visibleViewport, setVisibleViewport] = useState<VisibleViewport | null>(
    null,
  );
  const titleId = useId();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    previousScrollRef.current = { x: window.scrollX, y: window.scrollY };
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = "var(--scrollbar-width, 0px)";

    const closeButton = sheetRef.current?.querySelector<HTMLElement>(
      '[data-sheet-close="true"]',
    );
    closeButton?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
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
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      previousFocusRef.current?.focus({ preventScroll: true });

      const restoreViewport = () => {
        window.scrollTo({
          left: previousScrollRef.current.x,
          top: previousScrollRef.current.y,
          behavior: "auto",
        });
      };

      requestAnimationFrame(() => requestAnimationFrame(restoreViewport));
      window.setTimeout(restoreViewport, 120);
      window.setTimeout(restoreViewport, 320);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setDragOffset(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const viewport = window.visualViewport;
    const updateVisibleViewport = () => {
      setVisibleViewport({
        height: Math.round(viewport?.height ?? window.innerHeight),
        offsetTop: Math.round(viewport?.offsetTop ?? 0),
        isKeyboardOpen: Boolean(
          viewport && viewport.height < window.innerHeight - 80,
        ),
      });
    };

    updateVisibleViewport();
    viewport?.addEventListener("resize", updateVisibleViewport);
    viewport?.addEventListener("scroll", updateVisibleViewport);
    window.addEventListener("resize", updateVisibleViewport);

    return () => {
      viewport?.removeEventListener("resize", updateVisibleViewport);
      viewport?.removeEventListener("scroll", updateVisibleViewport);
      window.removeEventListener("resize", updateVisibleViewport);
      setVisibleViewport(null);
    };
  }, [isOpen]);

  if (!isOpen || !isMounted) return null;

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStartRef.current = event.clientY;
    dragOffsetRef.current = 0;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStartRef.current === null) return;
    const nextOffset = Math.max(0, event.clientY - dragStartRef.current);
    dragOffsetRef.current = nextOffset;
    setDragOffset(nextOffset);
  };

  const finishDrag = () => {
    dragStartRef.current = null;
    if (dragOffsetRef.current >= CLOSE_DRAG_THRESHOLD) {
      onClose();
      return;
    }
    dragOffsetRef.current = 0;
    setDragOffset(0);
  };

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[130] flex items-end justify-center lg:items-center lg:p-4"
      style={{
        height: visibleViewport?.height ?? "100dvh",
        top: visibleViewport?.offsetTop ?? 0,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[#2e170f]/45 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={onClose}
        aria-label="Đóng bảng sản phẩm"
      />

      <div
        ref={sheetRef}
        className={clsx(
          "relative flex w-full flex-col overflow-hidden rounded-t-[26px] border-t border-white/80 bg-white/94 shadow-[0_-18px_46px_rgba(61,36,23,0.22),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[28px] backdrop-saturate-[1.5]",
          "animate-in slide-in-from-bottom-full duration-300 ease-out",
          "lg:max-h-[90vh] lg:max-w-3xl lg:rounded-[18px] lg:slide-in-from-bottom-0",
          expanded ? "max-h-[92dvh]" : "max-h-[76dvh]",
          className,
        )}
        style={{
          transform: `translateY(${dragOffset}px)`,
          maxHeight: visibleViewport?.isKeyboardOpen
            ? `${Math.max(240, visibleViewport.height - 12)}px`
            : undefined,
          transition:
            dragStartRef.current === null ? "transform 180ms ease-out" : "none",
        }}
      >
        <button
          type="button"
          className="relative flex h-8 shrink-0 touch-none items-center justify-center bg-white/25 backdrop-blur-xl lg:hidden"
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          aria-label="Kéo xuống để đóng"
        >
          <span className="h-1 w-10 rounded-full bg-[#8c776b]/45 shadow-[0_1px_0_rgba(255,255,255,0.9)]" />
        </button>

        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        <button
          type="button"
          data-sheet-close="true"
          onClick={onClose}
          className="absolute right-3 top-9 z-20 grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-white/45 text-[#4f3022] shadow-[0_6px_18px_rgba(61,36,23,0.14),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-[18px] backdrop-saturate-150 transition active:scale-90 lg:top-3"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          className={clsx(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            contentClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-white/75 bg-white/55 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(61,36,23,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[24px] backdrop-saturate-150 lg:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
