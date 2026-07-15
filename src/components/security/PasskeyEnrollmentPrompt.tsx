"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

type PasskeyEnrollmentPromptProps = {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

export function PasskeyEnrollmentPrompt({
  isOpen,
  onComplete,
  onSkip,
}: PasskeyEnrollmentPromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function enroll() {
    if (!("PublicKeyCredential" in window)) {
      setError("Trình duyệt này chưa hỗ trợ passkey. Vui lòng mở bằng Chrome hoặc Safari.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const optionsResponse = await fetch(
        "/api/auth/passkeys/register/options",
        { method: "POST" },
      );
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) {
        throw new Error(options.error || "Không thể bắt đầu liên kết passkey.");
      }
      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });
      const verifyResponse = await fetch(
        "/api/auth/passkeys/register/verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response: registrationResponse }),
        },
      );
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) {
        throw new Error(result.error || "Không thể xác minh passkey.");
      }
      onComplete();
    } catch (enrollError) {
      setError(
        enrollError instanceof Error && enrollError.name !== "NotAllowedError"
          ? enrollError.message
          : "Bạn đã hủy hoặc trình duyệt chưa cho phép sử dụng sinh trắc học.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end bg-black/45" role="dialog" aria-modal="true" aria-labelledby="passkey-enrollment-title">
      <section className="mx-auto w-full max-w-[480px] rounded-t-[26px] bg-white px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#dfd2c8]" />
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#edf7eb] text-[#34802f]">
            <Fingerprint className="h-6 w-6" />
          </span>
          <div>
            <h2 id="passkey-enrollment-title" className="text-lg font-black text-[#3d2417]">
              Bật Face ID hoặc vân tay?
            </h2>
            <p className="mt-1 text-sm font-semibold leading-5 text-[#80685b]">
              Lần sau bạn có thể chọn sinh trắc học hoặc mã PIN để đăng nhập.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 rounded-xl bg-[#fff7ef] p-3 text-xs font-semibold leading-5 text-[#80685b]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#34802f]" />
          Vân tay và khuôn mặt chỉ được kiểm tra trên thiết bị, không gửi cho tiệm.
        </div>

        {error ? <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{error}</p> : null}

        <button type="button" onClick={enroll} disabled={isLoading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b84a39] text-sm font-black text-white disabled:opacity-60">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
          Bật ngay
        </button>
        <button type="button" onClick={onSkip} disabled={isLoading} className="mt-2 h-11 w-full text-sm font-bold text-[#80685b] disabled:opacity-50">
          Để sau
        </button>
      </section>
    </div>
  );
}
