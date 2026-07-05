"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Gift, Loader2, Phone } from "lucide-react";

export default function RegisterPage() {
  const [step, setStep] = useState<"profile" | "otp">("profile");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, birthday, gender }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Không thể gửi OTP.");
        return;
      }

      setDevOtp(data.devOtp || null);
      setStep("otp");
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

      window.location.href = "/account/rewards";
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] flex-col justify-center">
        <div className="mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#d85d6c] text-white shadow-[0_12px_24px_rgba(216,93,108,0.24)]">
            <Gift className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-[30px] font-black leading-tight">
            Nhận voucher thành viên
          </h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#7b6254]">
            Điền thông tin cơ bản, nhận OTP và mở ngay kho voucher của bạn.
          </p>
        </div>

        <section className="rounded-lg border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
          {devOtp && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              Mã test local: {devOtp}
            </p>
          )}

          {step === "profile" ? (
            <form onSubmit={requestOtp} className="mt-4 space-y-4">
              <Field label="Tên khách hàng" value={name} onChange={setName} required />
              <Field label="Số điện thoại" type="tel" value={phone} onChange={setPhone} required />
              <Field label="Ngày sinh" type="date" value={birthday} onChange={setBirthday} />
              <label className="block">
                <span className="text-xs font-black uppercase text-[#7b4b34]">Giới tính</span>
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
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white disabled:opacity-70">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Phone className="h-5 w-5" />}
                Gửi OTP
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="mt-4 space-y-4">
              <Field label="Mã OTP" value={otp} onChange={setOtp} required />
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white disabled:opacity-70">
                {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
                Xác nhận
              </button>
            </form>
          )}
        </section>

        <Link
          href="/account/login"
          className="mt-4 text-center text-sm font-bold text-[#7b6254]"
        >
          Đã có hồ sơ? Đăng nhập
        </Link>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase text-[#7b4b34]">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-12 w-full rounded-lg border border-[#eadbcc] bg-[#fffaf6] px-3 text-[15px] font-semibold outline-none focus:border-[#d85d6c]"
      />
    </label>
  );
}
