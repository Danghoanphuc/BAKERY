import { KeyRound } from "lucide-react";

import PinSetupFlow from "@/features/auth/PinSetupFlow";

export function PostOrderPinSetup({
  orderNumber,
  error,
  isSaving,
  onComplete,
}: {
  orderNumber: string;
  error: string | null;
  isSaving: boolean;
  onComplete: (pin: string) => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fff8ef] px-4 py-8 text-[#3d2417]">
      <section className="w-full max-w-[440px] rounded-[24px] border border-[#f0e1d2] bg-white p-5 shadow-[0_18px_50px_rgba(83,38,12,0.12)]">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-[16px] bg-[#b84a39] text-white">
            <KeyRound className="h-7 w-7" />
          </span>
          <p className="mt-4 text-xs font-black uppercase tracking-[0.08em] text-[#b84a39]">
            Đã tạo đơn #{orderNumber}
          </p>
          <h1 className="mt-1 text-2xl font-black">Tạo mã PIN đăng nhập</h1>
          <p className="mt-2 text-sm font-semibold leading-5 text-[#7b6254]">
            Hoàn tất bước này để lưu tài khoản và xem ngay đơn hàng vừa đặt.
          </p>
        </div>
        {error ? (
          <p className="mt-4 rounded-[12px] bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-3">
          <PinSetupFlow
            key={error || "pin-setup"}
            onComplete={onComplete}
            isLoading={isSaving}
          />
        </div>
        {isSaving ? (
          <p className="text-center text-xs font-bold text-[#9a7a66]">
            Đang lưu mã PIN và mở đơn hàng...
          </p>
        ) : null}
      </section>
    </main>
  );
}
