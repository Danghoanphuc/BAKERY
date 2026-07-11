"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Gift, ArrowRight, ArrowLeft } from "lucide-react";
import { getPhoneError, sanitizePhone } from "@/features/auth/pin-ui";
import PinSetupFlow from "@/features/auth/PinSetupFlow";

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Xử lý chuyển bước 1 -> 2
  function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng cho chúng mình biết tên của bạn nhé.");
      return;
    }
    setError(null);
    setStep(2);
  }

  // Xử lý chuyển bước 2 -> 3
  function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const phoneError = getPhoneError(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setError(null);
    setStep(3);
  }

  // Xử lý bước 3 (Gọi API sau khi nhập PIN xong)
  async function handleRegister(pin: string) {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/customers/self-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, pin, confirmPin: pin }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Không thể đăng ký. Số điện thoại này có thể đã tồn tại.",
        );
        setStep(2); // Đẩy về lại bước nhập số điện thoại nếu lỗi
        return;
      }
      window.location.href = "/account/rewards";
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Tiêu đề động tùy theo bước
  const stepTitles = {
    1: "Bạn tên là gì nhỉ?",
    2: "Số điện thoại của bạn?",
    3: "Thiết lập bảo mật",
  };

  const stepDescriptions = {
    1: "Để chúng mình xưng hô thật thân thiết nhé.",
    2: "Dùng để tích điểm và nhận ưu đãi riêng.",
    3: "Tạo mã PIN để bảo vệ tài khoản của bạn.",
  };

  return (
    <main className="min-h-screen bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] flex-col justify-center">
        {/* Nút Back - Chỉ hiện ở bước 2 và 3 */}
        <div className="mb-6 flex h-6 items-center">
          {step > 1 && !isSubmitting && (
            <button
              onClick={() => {
                setError(null);
                setStep((prev) => (prev - 1) as 1 | 2);
              }}
              className="flex items-center gap-1 text-[14px] font-bold text-[#7b6254] hover:text-[#b84a39] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="grid h-14 w-14 place-items-center rounded-[16px] bg-[#b84a39] text-white shadow-[0_12px_24px_rgba(184,74,57,0.24)] transition-transform">
            <Gift className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-[28px] font-black leading-tight animate-in fade-in slide-in-from-bottom-2">
            {stepTitles[step]}
          </h1>
          <p className="mt-2 text-[15px] font-semibold leading-6 text-[#7b6254] animate-in fade-in slide-in-from-bottom-2">
            {stepDescriptions[step]}
          </p>
        </div>

        <section className="rounded-2xl border border-[#f0e1d2] bg-white p-5 shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          {/* Thanh Tiến Trình (Progress Indicator) */}
          <div className="mb-6 flex justify-center gap-2">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-1.5 w-10 rounded-full transition-all duration-300 ${
                  step >= item ? "bg-[#b84a39]" : "bg-[#eadbcc]"
                }`}
              />
            ))}
          </div>

          {/* Báo lỗi có hiệu ứng rung */}
          {error && (
            <p className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700 animate-shake">
              {error}
            </p>
          )}

          {/* Render Nội Dung Từng Bước */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            {step === 1 && (
              <form onSubmit={handleNameSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#7b4b34]">
                    Tên khách hàng
                  </span>
                  <input
                    type="text"
                    value={name}
                    autoFocus
                    required
                    placeholder="Ví dụ: Minh Hằng"
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 w-full rounded-xl border-2 border-[#eadbcc] bg-[#fffaf6] px-4 text-[16px] font-bold outline-none focus:border-[#b84a39] transition-colors"
                  />
                </label>

                <button
                  type="submit"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#b84a39] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(184,74,57,0.2)] transition-all active:scale-[0.98]"
                >
                  Tiếp tục <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handlePhoneSubmit} className="space-y-5">
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
                    onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                    placeholder="Ví dụ: 0901234567"
                    className="h-14 w-full rounded-xl border-2 border-[#eadbcc] bg-[#fffaf6] px-4 text-[16px] font-bold outline-none focus:border-[#b84a39] transition-colors"
                  />
                </label>

                <button
                  type="submit"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#b84a39] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(184,74,57,0.2)] transition-all active:scale-[0.98]"
                >
                  Tiếp tục <ArrowRight className="h-5 w-5" />
                </button>
              </form>
            )}

            {step === 3 && (
              <PinSetupFlow
                onComplete={handleRegister}
                isLoading={isSubmitting}
              />
            )}
          </div>
        </section>

        {/* Nút chuyển về đăng nhập (Chỉ hiện ở bước 1) */}
        {step === 1 && (
          <div className="mt-6 text-center">
            <Link
              href="/account/login"
              className="text-[14px] font-bold text-[#7b6254] hover:text-[#b84a39] transition-colors"
            >
              Đã có tài khoản? Đăng nhập ngay
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
