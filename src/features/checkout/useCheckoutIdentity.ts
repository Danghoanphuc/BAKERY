"use client";

import { useEffect, useRef, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";

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
  const [securityChallenge, setSecurityChallenge] = useState<{
    siteKey: string;
    action: string;
  } | null>(null);
  const [offerPasskeyEnrollment, setOfferPasskeyEnrollment] = useState(false);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const checkedPhoneRef = useRef("");

  useEffect(() => {
    if (isAuthenticated) {
      setStatus("authenticated");
      setError(null);
      return;
    }

    setPin("");
    setError(null);
    setPasskeyAvailable(false);

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
        setPasskeyAvailable(payload.passkeyAvailable === true);
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

  async function signIn(securityChallengeToken?: string) {
    if (status !== "pin_required" || pin.length !== 4) return false;

    setStatus("signing_in");
    setError(null);
    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, securityChallengeToken }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (
          payload?.code === "challenge_required" &&
          typeof payload.siteKey === "string" &&
          typeof payload.action === "string"
        ) {
          setSecurityChallenge({
            siteKey: payload.siteKey,
            action: payload.action,
          });
          setStatus("pin_required");
          return false;
        }
        throw new Error(payload?.error || "Số điện thoại hoặc mã PIN chưa đúng.");
      }

      onAuthenticated(payload.customer as Customer);
      setOfferPasskeyEnrollment(
        payload?.passkey?.shouldOfferEnrollment === true,
      );
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

  async function signInWithPasskey() {
    if (status !== "pin_required" || !passkeyAvailable) return false;

    setStatus("signing_in");
    setError(null);
    try {
      const optionsResponse = await fetch(
        "/api/auth/passkeys/authenticate/options",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        },
      );
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) {
        throw new Error(options.error || "Không thể dùng passkey.");
      }
      const authenticationResponse = await startAuthentication({
        optionsJSON: options,
      });
      const verifyResponse = await fetch(
        "/api/auth/passkeys/authenticate/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: authenticationResponse }),
        },
      );
      const payload = await verifyResponse.json();
      if (!verifyResponse.ok || !payload.customer) {
        throw new Error(payload.error || "Passkey không hợp lệ.");
      }
      onAuthenticated(payload.customer as Customer);
      setStatus("authenticated");
      setPin("");
      return true;
    } catch (passkeyError) {
      setStatus("pin_required");
      setError(
        passkeyError instanceof Error && passkeyError.name !== "NotAllowedError"
          ? passkeyError.message
          : "Bạn đã hủy hoặc trình duyệt chưa hỗ trợ sinh trắc học.",
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
    signInWithPasskey,
    passkeyAvailable,
    securityChallenge,
    cancelSecurityChallenge: () => setSecurityChallenge(null),
    completeSecurityChallenge: async (token: string) => {
      setSecurityChallenge(null);
      return signIn(token);
    },
    offerPasskeyEnrollment,
    dismissPasskeyEnrollment: () => setOfferPasskeyEnrollment(false),
    retryRecognition: () => {
      checkedPhoneRef.current = "";
      setRecognitionAttempt((attempt) => attempt + 1);
    },
  };
}
