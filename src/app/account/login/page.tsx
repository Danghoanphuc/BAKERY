"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowRight, KeyRound, Loader2, MessageCircle, Phone } from "lucide-react";

type LoginStep = "phone" | "profile" | "otp" | "password";

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
  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    setDevOtp(null);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name, birthday, gender }),
      });
      const data = await response.json();

      if (data.requiresProfile) {
        setStep("profile");
        setNotice(data.message);
        return;
      }

      if (!response.ok) {
        setError(data.error || "Không thể gửi OTP.");
        return;
      }

      setNotice(data.message || "Mã OTP đã được gửi.");
      setDevOtp(data.devOtp || null);
      setStep("otp");
    } catch (err) {
      console.error("Request OTP failed:", err);
      setError("Không thể gửi OTP. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "OTP không đúng.");
        return;
      }

      window.location.href = nextPath;
    } catch (err) {
      console.error("Verify OTP failed:", err);
      setError("Không thể xác thực OTP.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loginWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Đăng nhập chưa thành công.");
        return;
      }

      window.location.href = nextPath;
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-center">
        <div className="mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#d85d6c] text-white shadow-[0_12px_24px_rgba(216,93,108,0.24)]">
            <Phone className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-tight">
            Nhập số điện thoại
          </h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#7b6254]">
            Tiệm sẽ gửi OTP để mở voucher, điểm tích lũy và đơn hàng của bạn.
          </p>
        </div>

        <section className="rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          {notice && <Notice tone="success" text={notice} />}
          {error && <Notice tone="error" text={error} />}
          {devOtp && (
            <Notice tone="warning" text={`Mã test local: ${devOtp}`} />
          )}

          {step === "phone" && (
            <form onSubmit={requestOtp} className="mt-4 space-y-4">
              <Field label="Số điện thoại" type="tel" value={phone} onChange={setPhone} />
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                Nhận mã OTP
              </button>
            </form>
          )}

          {step === "profile" && (
            <form onSubmit={requestOtp} className="mt-4 space-y-4">
              <Field label="Số điện thoại" type="tel" value={phone} onChange={setPhone} />
              <Field label="Tên của bạn" value={name} onChange={setName} />
              <Field label="Ngày sinh" type="date" value={birthday} onChange={setBirthday} />
              <label className="block">
                <span className="text-xs font-black uppercase text-[#7b4b34]">
                  Giới tính
                </span>
                <select
                  value={gender}
                  onChange={(event) => setGender(event.target.value)}
                  className="mt-1 h-12 w-full rounded-lg border border-[#eadbcc] bg-[#fffaf6] px-3 text-[15px] font-semibold outline-none focus:border-[#d85d6c]"
                >
                  <option value="">Chưa chọn</option>
                  <option value="female">Nữ</option>
                  <option value="male">Nam</option>
                  <option value="other">Khác</option>
                </select>
              </label>
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                Gửi OTP
              </button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verifyOtp} className="mt-4 space-y-4">
              <Field label="Mã OTP" inputMode="numeric" value={otp} onChange={setOtp} />
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                Xác nhận
              </button>
              <button
                type="button"
                onClick={() => requestOtp()}
                className="flex h-11 w-full items-center justify-center rounded-lg border border-[#eadbcc] text-sm font-black text-[#3d2417]"
              >
                Gửi lại OTP
              </button>
            </form>
          )}

          {step === "password" && (
            <form onSubmit={loginWithPassword} className="mt-4 space-y-4">
              <Field label="Số điện thoại" type="tel" value={phone} onChange={setPhone} />
              <Field label="Mật khẩu" type="password" value={password} onChange={setPassword} />
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white disabled:opacity-70"
                disabled={isSubmitting}
              >
                <KeyRound className="h-5 w-5" />
                Đăng nhập
              </button>
            </form>
          )}

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => setStep(step === "password" ? "phone" : "password")}
              className="flex h-11 w-full items-center justify-center rounded-lg border border-[#eadbcc] text-sm font-black text-[#3d2417]"
            >
              {step === "password" ? "Dùng OTP" : "Tôi có mật khẩu"}
            </button>
            <a
              href="/auth/zalo"
              className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#0068ff] text-sm font-black text-[#0068ff]"
            >
              <MessageCircle className="h-5 w-5" />
              Zalo
            </a>
          </div>
        </section>

        <div className="mt-4 grid gap-2 text-center text-sm font-bold text-[#7b6254]">
          <Link href="/rewards" className="inline-flex items-center justify-center gap-1">
            Xem voucher công khai <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/">Xem bánh trước</Link>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric";
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-[#7b4b34]">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-lg border border-[#eadbcc] bg-[#fffaf6] px-3 text-[15px] font-semibold outline-none focus:border-[#d85d6c]"
      />
    </label>
  );
}

function Notice({
  text,
  tone,
}: {
  text: string;
  tone: "success" | "error" | "warning";
}) {
  const className =
    tone === "success"
      ? "bg-green-50 text-green-700"
      : tone === "error"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-800";

  return (
    <p className={`mt-4 rounded-lg px-3 py-2 text-sm font-semibold ${className}`}>
      {text}
    </p>
  );
}
