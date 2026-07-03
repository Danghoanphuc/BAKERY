"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { MessageCircle, Phone, ShieldCheck } from "lucide-react";

const errorMessages: Record<string, string> = {
  magic_missing: "Link không tồn tại. Bạn có thể nhập số điện thoại để quán tạo lại link đăng nhập.",
  magic_used: "Link này đã được dùng một lần. Hãy nhập số điện thoại để quán tạo lại link mới.",
  magic_expired: "Link đã hết hạn. Hãy nhập số điện thoại để quán tạo lại link mới.",
  missing_token: "Link không hợp lệ. Hãy nhập số điện thoại để quán tạo lại link mới.",
  zalo_not_configured: "Đăng nhập Zalo chưa được cấu hình.",
  zalo_missing_code: "Zalo chưa trả mã đăng nhập.",
  zalo_no_customer: "Không tìm thấy tài khoản khớp với Zalo của bạn.",
  zalo_failed: "Đăng nhập Zalo chưa thành công. Vui lòng thử lại.",
};

export default function AccountLoginPage() {
  return (
    <Suspense fallback={null}>
      <AccountLoginContent />
    </Suspense>
  );
}

function AccountLoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = error ? errorMessages[error] : undefined;
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handlePhoneRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setNotice(null);
    setFormError(null);

    try {
      const response = await fetch("/api/auth/phone-login-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFormError(data.error || "Không thể tạo yêu cầu đăng nhập");
        return;
      }

      setNotice(data.message);
    } catch (err) {
      console.error("Phone login request failed:", err);
      setFormError("Không thể tạo yêu cầu đăng nhập. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-50 pt-20">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-10">
        <div className="w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Đăng nhập tài khoản Bakery
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Nhập số điện thoại đã được tạo trong CRM. Hệ thống sẽ tạo magic link mới để nhân viên gửi thủ công cho bạn.
          </p>

          {message && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {message}
            </div>
          )}

          {notice && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {notice}
            </div>
          )}

          {formError && (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handlePhoneRequest} className="mt-6 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Số điện thoại
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Ví dụ: 0901234567"
                className="w-full rounded-lg border border-neutral-300 px-3 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Phone className="h-5 w-5" />
              {isSubmitting ? "Đang tạo yêu cầu..." : "Yêu cầu magic link"}
            </button>
          </form>

          <a
            href="/auth/zalo"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#0068ff] px-4 py-3 text-sm font-semibold text-[#0068ff] hover:bg-blue-50"
          >
            <MessageCircle className="h-5 w-5" />
            Đăng nhập bằng Zalo
          </a>

          <Link
            href="/order"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Xem bánh trước
          </Link>
        </div>
      </div>
    </main>
  );
}
