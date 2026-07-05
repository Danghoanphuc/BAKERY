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
    <main className="min-h-screen bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[460px] flex-col justify-center">
        <section className="rounded-lg border border-[#f0e1d2] bg-white p-6 text-center shadow-[0_14px_30px_rgba(83,38,12,0.08)]">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-5 text-2xl font-black">
            Đặt hàng thành công!
          </h1>
          {orderNumber && (
            <p className="mt-2 text-sm font-black text-[#d85d6c]">
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
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#d85d6c] text-sm font-black text-white"
            >
              <Gift className="h-5 w-5" />
              Xem voucher của tôi
            </button>
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#eadbcc] text-sm font-black text-[#3d2417]"
            >
              <UserRound className="h-5 w-5" />
              Mở hồ sơ tích điểm
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#eadbcc] text-sm font-black text-[#3d2417]"
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
