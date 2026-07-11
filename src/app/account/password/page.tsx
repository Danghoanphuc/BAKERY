"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { sanitizePin } from "@/features/auth/pin-ui";
import PinSetupFlow from "@/features/auth/PinSetupFlow";

function PasswordPageContent() {
  const [hasPin, setHasPin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // phase: "current" (Nhập PIN cũ) -> "new" (Luồng tạo PIN mới)
  const [phase, setPhase] = useState<"current" | "new" | "success">("current");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMe() {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        window.location.href = "/account/login?next=/account/password";
        return;
      }
      const data = await response.json();
      const userHasPin = Boolean(data.customer.hasPassword);
      setHasPin(userHasPin);
      setPhase(userHasPin ? "current" : "new");
      setIsLoading(false);
    }
    loadMe();
  }, []);

  // Tự động nhảy sang bước tiếp theo khi nhập đủ mã PIN cũ
  useEffect(() => {
    if (phase === "current" && currentPin.length === 4) {
      setError(null);
      setPhase("new");
    }
  }, [currentPin, phase]);

  async function handleUpdatePin(newPin: string) {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Mã PIN cũ không chính xác hoặc lỗi hệ thống.");
        // Nếu lỗi do PIN cũ sai, đẩy lại bước nhập PIN cũ
        setPhase(hasPin ? "current" : "new");
        setCurrentPin("");
        return;
      }
      setPhase("success");
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef]">
        <Loader2 className="h-6 w-6 animate-spin text-[#b84a39]" />
      </main>
    );
  }

  if (phase === "success") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef] px-4 text-[#3d2417]">
        <div className="text-center w-full max-w-[400px]">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-600 mb-4" />
          <h1 className="text-2xl font-black mb-2">Đổi mã PIN thành công!</h1>
          <p className="text-sm font-semibold text-[#7b6254] mb-6">
            Mã PIN mới của bạn đã được cập nhật.
          </p>
          <Link
            href="/profile"
            className="flex h-12 items-center justify-center rounded-lg bg-[#b84a39] text-sm font-black text-white"
          >
            Về trang hồ sơ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] flex-col justify-center">
        {phase === "new" && hasPin && (
          <button
            onClick={() => {
              setPhase("current");
              setCurrentPin("");
            }}
            className="mb-4 flex items-center gap-1 text-[13px] font-bold text-[#7b6254]"
          >
            <ArrowLeft className="h-4 w-4" /> Đổi mã PIN cũ
          </button>
        )}

        <div className="mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#b84a39] text-white">
            <KeyRound className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-tight">
            {hasPin ? "Đổi mã PIN" : "Tạo mã PIN"}
          </h1>
        </div>

        <div className="rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          {phase === "current" ? (
            <label className="block text-center py-4">
              <span className="text-[16px] font-black uppercase text-[#7b4b34]">
                Nhập mã PIN hiện tại
              </span>
              <div className="mt-6">
                <input
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  autoFocus
                  maxLength={4}
                  onChange={(event) =>
                    setCurrentPin(sanitizePin(event.target.value))
                  }
                  className="h-14 w-40 rounded-xl border-2 border-[#eadbcc] bg-[#fffaf6] px-3 text-center text-[28px] font-black tracking-[0.3em] outline-none focus:border-[#b84a39]"
                />
              </div>
            </label>
          ) : (
            <PinSetupFlow onComplete={handleUpdatePin} isLoading={isSaving} />
          )}
        </div>

        <Link
          href="/profile"
          className="mt-4 text-center text-sm font-bold text-[#7b6254]"
        >
          Hủy và quay lại
        </Link>
      </div>
    </main>
  );
}

export default function PasswordPage() {
  return (
    <Suspense fallback={null}>
      <PasswordPageContent />
    </Suspense>
  );
}
