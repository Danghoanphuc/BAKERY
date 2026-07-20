"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  headerContent?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  headerAction,
  headerContent,
  footer,
  className,
  contentClassName,
  titleClassName,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableElement = useRef<HTMLElement | null>(null);
  const lastFocusableElement = useRef<HTMLElement | null>(null);

  // Handle focus trap
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get focusable elements
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements && focusableElements.length > 0) {
      firstFocusableElement.current = focusableElements[0] as HTMLElement;
      lastFocusableElement.current = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      // Focus the first element
      firstFocusableElement.current?.focus();
    }

    // Cleanup function to restore focus
    return () => {
      previousActiveElement.current?.focus();
    };
  }, [isOpen]);

  // Handle body scroll lock
  useEffect(() => {
    if (typeof document === "undefined") return;

    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "var(--scrollbar-width, 0px)";
    } else {
      // Restore body scroll
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    // Cleanup
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      // Handle tab key for focus trap
      if (event.key === "Tab") {
        if (!firstFocusableElement.current || !lastFocusableElement.current)
          return;

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstFocusableElement.current) {
            event.preventDefault();
            lastFocusableElement.current.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastFocusableElement.current) {
            event.preventDefault();
            firstFocusableElement.current.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  // Portal rendering for proper z-index
  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end lg:items-center justify-center lg:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        ref={modalRef}
        className={clsx(
          // Bottom sheet positioning and animation for mobile
          "relative w-full bg-white",
          "rounded-t-2xl lg:rounded-2xl shadow-xl",
          "transform transition-transform duration-300 ease-out",
          "animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0",
          // Safe area for iOS devices
          "pb-safe-area-inset-bottom",
          // Desktop max width and centering
          "lg:max-w-4xl lg:max-h-[90vh]",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-neutral-200 px-4 py-3 lg:p-4">
          <div className="flex items-center justify-between gap-3">
            <h2
              id="modal-title"
              className={clsx(
                "min-w-0 flex-1 text-lg font-semibold text-neutral-900",
                titleClassName,
              )}
            >
              {title}
            </h2>
            <div className="flex shrink-0 items-center gap-1.5">
              {headerAction}
              <button
                onClick={onClose}
                className="-mr-2 rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 touch-target"
                aria-label="Đóng"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-5 w-5"
                >
                  <path
                    d="M15 5L5 15M5 5L15 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          {headerContent && <div className="mt-2.5">{headerContent}</div>}
        </div>

        {/* Content */}
        <div
          className={clsx(
            "min-h-0 flex-1 overflow-y-auto p-4 lg:p-6",
            contentClassName,
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_22px_rgba(61,36,23,0.08)] lg:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
