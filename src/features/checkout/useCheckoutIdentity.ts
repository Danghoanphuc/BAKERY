"use client";

import { useEffect, useRef, useState } from "react";

import { isValidVietnamPhone, sanitizePin } from "@/features/auth/pin-ui";
import type { Customer } from "@/types";

export type CheckoutIdentityStatus =
  | "idle"
  | "checking"
  | "guest"
  | "pin_required"
  | "signing_in"
  | "authenticated";

export function useCheckoutIdentity({
  phone,
  isAuthenticated,
  onAuthenticated,
}: {
  phone: string;
  isAuthenticated: boolean;
  onAuthenticated: (customer: Customer) => void;
}) {
  const [status, setStatus] = useState<CheckoutIdentityStatus>(
    isAuthenticated ? "authenticated" : "idle",
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recognitionAttempt, setRecognitionAttempt] = useState(0);
  const checkedPhoneRef = useRef("");

  useEffect(() => {
    if (isAuthenticated) {
      setStatus("authenticated");
      setError(null);
      return;
    }

    setPin("");
    setError(null);

    if (!isValidVietnamPhone(phone)) {
      checkedPhoneRef.current = "";
      setStatus("idle");
      return;
    }

    if (checkedPhoneRef.current === phone) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("checking");
      try {
        const response = await fetch("/api/auth/checkout-recognition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Không thể kiểm tra số điện thoại.");
        }

        checkedPhoneRef.current = phone;
        setStatus(payload.verificationRequired ? "pin_required" : "guest");
      } catch (recognitionError) {
        if (controller.signal.aborted) return;
        setStatus("guest");
        setError(
          recognitionError instanceof Error ? recognitionError.message : null,
        );
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isAuthenticated, phone, recognitionAttempt]);

  async function signIn() {
    if (status !== "pin_required" || pin.length !== 4) return false;

    setStatus("signing_in");
    setError(null);
    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Số điện thoại hoặc mã PIN chưa đúng.");
      }

      onAuthenticated(payload.customer as Customer);
      setStatus("authenticated");
      setPin("");
      return true;
    } catch (signInError) {
      setStatus("pin_required");
      setError(
        signInError instanceof Error
          ? signInError.message
          : "Không thể đăng nhập lúc này.",
      );
      return false;
    }
  }

  return {
    status,
    pin,
    error,
    setPin: (value: string) => setPin(sanitizePin(value)),
    signIn,
    retryRecognition: () => {
      checkedPhoneRef.current = "";
      setRecognitionAttempt((attempt) => attempt + 1);
    },
  };
}
