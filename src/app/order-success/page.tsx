"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/common";

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
    <main className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">
          Đặt hàng thành công!
        </h1>
        {orderNumber && (
          <p className="text-lg text-primary-600 font-semibold mb-6">
            Mã đơn hàng: {orderNumber}
          </p>
        )}
        <p className="text-neutral-600 mb-8">
          Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ sớm để xác nhận đơn hàng của bạn.
        </p>
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full py-3"
            onClick={() => router.push("/")}
          >
            Tiếp tục mua sắm
          </Button>
          <Button
            variant="outline"
            className="w-full py-3"
            onClick={() => router.push("/admin/orders")}
          >
            Xem đơn hàng (Admin)
          </Button>
        </div>
      </div>
    </main>
  );
}
