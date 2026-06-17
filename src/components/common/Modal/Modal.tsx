"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { clsx } from "clsx";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const firstFocusableElement = useRef<HTMLElement | null>(null);
  const lastFocusableElement = useRef<HTMLElement | null>(null);

  // Handle focus trap
  useEffect(() => {
    if (!isOpen) return;

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
    if (!isOpen) return;

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

  if (!isOpen) return null;

  // Portal rendering for proper z-index
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-4"
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
        <div className="flex items-center justify-between p-4 border-b border-neutral-200">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-neutral-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors touch-target"
            aria-label="Đóng"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="w-5 h-5"
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

        {/* Content */}
        <div className="p-4 lg:p-6 max-h-[70vh] lg:max-h-[calc(90vh-5rem)] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};
