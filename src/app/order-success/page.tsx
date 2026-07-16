"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Gift, Home, UserRound } from "lucide-react";

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={null}>
      <OrderSuccessContent />
    </Suspense>
  );
}

function OrderSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");

  return (
    <main className="brand-page px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] flex-col justify-center">
        <section className="brand-card p-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-teal-soft text-teal">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="brand-heading mt-5 text-2xl">
            Đặt hàng thành công!
          </h1>
          {orderNumber && (
            <p className="mt-2 text-sm font-black text-brand-500">
              Mã đơn hàng: {orderNumber}
            </p>
          )}
          <p className="mt-4 text-sm font-semibold leading-6 text-[#7b6254]">
            Tiệm đã ghi nhận đơn và tự lưu hồ sơ theo số điện thoại của bạn. Lần
            sau bạn có thể dùng voucher, xem điểm và đặt bánh nhanh hơn.
          </p>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => router.push("/account/rewards")}
              className="brand-button-primary"
            >
              <Gift className="h-5 w-5" />
              Xem voucher của tôi
            </button>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="brand-button-secondary"
            >
              <UserRound className="h-5 w-5" />
              Mở hồ sơ tích điểm
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="brand-button-secondary"
            >
              <Home className="h-5 w-5" />
              Tiếp tục xem bánh
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
