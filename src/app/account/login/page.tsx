"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState, useRef } from "react";
import { ArrowRight, KeyRound, Loader2, Phone } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import {
  getPhoneError,
  sanitizePhone,
  sanitizePin,
} from "@/features/auth/pin-ui";
import { TurnstileChallenge } from "@/components/security/TurnstileChallenge";
import { PasskeyEnrollmentPrompt } from "@/components/security/PasskeyEnrollmentPrompt";
import { BiometricSignInButton } from "@/components/security/BiometricSignInButton";
import { assertPasskeyRpMatchesCurrentHost } from "@/lib/auth/passkey-client";

type LoginStep = "pin" | "link";

export default function AccountLoginPage() {
  return (
    <Suspense fallback={null}>
      <AccountLoginContent />
    </Suspense>
  );
}

function AccountLoginContent() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/profile";
  const [step, setStep] = useState<LoginStep>("pin");

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [securityChallenge, setSecurityChallenge] = useState<{
    siteKey: string;
    action: string;
  } | null>(null);
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [offerPasskeyEnrollment, setOfferPasskeyEnrollment] = useState(false);

  useEffect(() => {
    setPasskeyAvailable(false);
    if (phone.length !== 10 || getPhoneError(phone)) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/auth/passkeys/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (response.ok) setPasskeyAvailable(payload?.available === true);
      } catch {
        // PIN login remains available when capability discovery fails.
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [phone]);

  async function loginWithPin(
    event?: FormEvent<HTMLFormElement>,
    securityChallengeToken?: string,
  ) {
    event?.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    const phoneError = getPhoneError(phone);
    if (phoneError) {
      setError(phoneError);
      setIsSubmitting(false);
      return;
    }

    if (pin.length !== 4) {
      setError("Vui lòng nhập đủ mã PIN 4 số.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, securityChallengeToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (
          data?.code === "challenge_required" &&
          typeof data.siteKey === "string" &&
          typeof data.action === "string"
        ) {
          setSecurityChallenge({ siteKey: data.siteKey, action: data.action });
          return;
        }
        setError(data.error || "Mã PIN hoặc số điện thoại không chính xác.");
        return;
      }
      if (data?.passkey?.shouldOfferEnrollment) {
        setOfferPasskeyEnrollment(true);
        return;
      }
      window.location.href = nextPath;
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);

    const phoneError = getPhoneError(phone);
    if (phoneError) {
      setError(phoneError);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/phone-login-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Không thể tạo link đăng nhập.");
        return;
      }
      setNotice(data.message || "Đã gửi link đăng nhập qua tin nhắn Zalo/SMS.");
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loginWithPasskey() {
    const phoneError = getPhoneError(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setIsSubmitting(true);
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
      assertPasskeyRpMatchesCurrentHost(options.rpId);
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
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(result.error || "Passkey không hợp lệ.");
      }
      window.location.href = nextPath;
    } catch (passkeyError) {
      setError(
        passkeyError instanceof Error && passkeyError.name !== "NotAllowedError"
          ? passkeyError.message
          : "Bạn đã hủy hoặc trình duyệt này chưa hỗ trợ passkey.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-center">
        <div className="mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#b84a39] text-white shadow-[0_12px_24px_rgba(184,74,57,0.24)]">
            <Phone className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-tight">
            Đăng nhập tài khoản
          </h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#7b6254]">
            Nhập số điện thoại và mã PIN để tích lũy
          </p>
        </div>

        <section className="rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          {notice && (
            <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              {notice}
            </p>
          )}
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 animate-shake">
              {error}
            </p>
          )}

          {step === "pin" ? (
            <form onSubmit={loginWithPin} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase text-[#7b4b34]">
                  Số điện thoại
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  autoFocus
                  required
                  value={phone}
                  onChange={(event) =>
                    setPhone(sanitizePhone(event.target.value))
                  }
                  className="h-14 w-full rounded-xl border-2 border-[#eadbcc] bg-[#fffaf6] px-4 text-[16px] font-bold outline-none focus:border-[#b84a39] transition-colors"
                  placeholder="Ví dụ: 0901234567"
                />
              </label>

              <PinField
                label="Mã PIN 4 số"
                value={pin}
                onChange={setPin}
                onForgotPin={() => setStep("link")}
                disabled={isSubmitting}
              />

              <div className="mt-2 flex gap-2.5">
                <button
                  type="submit"
                  className="flex h-14 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-[#b84a39] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(184,74,57,0.2)] transition-all active:scale-[0.98] disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <KeyRound className="h-5 w-5" />
                  )}
                  Đăng nhập
                </button>
                {passkeyAvailable ? (
                  <BiometricSignInButton
                    onClick={loginWithPasskey}
                    isLoading={isSubmitting}
                    className="h-14 w-14"
                  />
                ) : null}
              </div>
            </form>
          ) : (
            <form onSubmit={requestMagicLink} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase text-[#7b4b34]">
                  Số điện thoại
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  autoFocus
                  value={phone}
                  onChange={(event) =>
                    setPhone(sanitizePhone(event.target.value))
                  }
                  className="h-14 w-full rounded-xl border-2 border-[#eadbcc] bg-[#fffaf6] px-4 text-[16px] font-bold outline-none focus:border-[#b84a39] transition-colors"
                  placeholder="Ví dụ: 0901234567"
                />
              </label>

              <button
                type="submit"
                className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#b84a39] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(184,74,57,0.2)] disabled:opacity-70 transition-all active:scale-[0.98]"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                Gửi link đăng nhập (Không cần PIN)
              </button>

              <button
                type="button"
                onClick={() => setStep("pin")}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-xl text-[14px] font-bold text-[#7b6254] hover:bg-orange-50 transition-colors"
              >
                Quay lại đăng nhập bằng PIN
              </button>
            </form>
          )}
        </section>

        <div className="mt-6 grid gap-2 text-center text-[14px] font-bold text-[#7b6254]">
          <Link
            href="/account/register"
            className="inline-flex items-center justify-center gap-1 hover:text-[#b84a39] transition-colors"
          >
            Chưa có tài khoản? Đăng ký ngay <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {securityChallenge ? (
        <TurnstileChallenge
          siteKey={securityChallenge.siteKey}
          action={securityChallenge.action}
          onCancel={() => setSecurityChallenge(null)}
          onToken={(token) => {
            if (!token) return;
            setSecurityChallenge(null);
            void loginWithPin(undefined, token);
          }}
        />
      ) : null}
      <PasskeyEnrollmentPrompt
        isOpen={offerPasskeyEnrollment}
        onComplete={() => {
          setOfferPasskeyEnrollment(false);
          window.location.href = nextPath;
        }}
        onSkip={() => {
          setOfferPasskeyEnrollment(false);
          window.location.href = nextPath;
        }}
      />
    </main>
  );
}

/**
 * Component PinField chuyên biệt cho màn hình Đăng nhập
 * Có tích hợp sẵn nút "Quên mã PIN" và chia 4 ô dàn đều
 */
function PinField({
  label,
  value,
  onChange,
  onForgotPin,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onForgotPin: () => void;
  disabled?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const renderFakeBoxes = () => {
    return Array.from({ length: 4 }).map((_, index) => {
      const char = value[index];
      const isActive = isFocused && index === value.length;

      return (
        <div
          key={index}
          className={`relative flex h-14 flex-1 items-center justify-center rounded-xl border-2 bg-[#fffaf6] transition-all ${
            isActive
              ? "border-[#b84a39] shadow-[0_0_0_3px_rgba(184,74,57,0.15)]"
              : "border-[#eadbcc] text-[#3d2417]"
          }`}
        >
          {char ? (
            <span className="h-3.5 w-3.5 rounded-full bg-current"></span>
          ) : (
            isActive && (
              <span className="h-6 w-[2px] bg-[#b84a39] animate-blink"></span>
            )
          )}
        </div>
      );
    });
  };

  return (
    <div className="block relative">
      <div className="mb-2 flex items-end justify-between">
        <span className="text-xs font-black uppercase text-[#7b4b34]">
          {label}
        </span>
        <button
          type="button"
          onClick={onForgotPin}
          className="text-[12px] font-bold text-[#b84a39] hover:underline"
        >
          Quên mã PIN?
        </button>
      </div>

      <div
        className="relative flex justify-between gap-3 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Render 4 ô UI giả mạo */}
        {renderFakeBoxes()}

        {/* Lớp logic: Input vô hình đè lên toàn bộ */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={4}
          required
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(sanitizePin(event.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 h-full w-full opacity-0 outline-none cursor-text"
        />
      </div>
    </div>
  );
}
