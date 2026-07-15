"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";

import { BottomSheet } from "@/components/common";
import PinSetupFlow from "@/features/auth/PinSetupFlow";

export function CustomerPinSetupPrompt({
  isVisible,
  onCompleted,
}: {
  isVisible: boolean;
  onCompleted?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowKey, setFlowKey] = useState(0);
  const savingRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  const savePin = useCallback(
    async (pin: string) => {
      if (savingRef.current) return;
      savingRef.current = true;
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPin: pin }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "Không thể lưu mã PIN.");
        }

        setIsOpen(false);
        onCompletedRef.current?.();
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Không thể lưu mã PIN.",
        );
        setFlowKey((key) => key + 1);
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [],
  );

  if (!isVisible) return null;

  return (
    <>
      <section className="rounded-[16px] border border-[#efd8bd] bg-[linear-gradient(135deg,#fff8e9,#fff1dc)] p-3 shadow-[0_5px_16px_rgba(116,57,21,0.06)]">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#b84a39] text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-[#542413]">
              Giữ đơn hàng luôn trong tầm tay
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-4 text-[#8d6b59]">
              Tạo PIN để đăng nhập, xem đơn, nhận voucher và ưu đãi trên mọi thiết bị.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#542413] text-xs font-black text-white active:scale-[0.99]"
        >
          <KeyRound className="h-4 w-4" />
          Thiết lập PIN 4 số
        </button>
      </section>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => !isSaving && setIsOpen(false)}
        title="Thiết lập mã PIN"
        className="lg:max-w-md"
        contentClassName="px-4 pb-5"
      >
        <div className="pb-1 pt-1 pr-10">
          <h2 className="text-lg font-black text-[#3d2417]">
            Thiết lập mã PIN
          </h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#7b6254]">
            PIN gồm 4 số và có thể dùng để đăng nhập trên thiết bị khác.
          </p>
        </div>
        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[12px] bg-red-50 px-3 py-2 text-center text-sm font-bold text-red-700"
          >
            {error}
          </p>
        ) : null}
        <PinSetupFlow
          key={flowKey}
          onComplete={savePin}
          isLoading={isSaving}
        />
        {isSaving ? (
          <p className="text-center text-xs font-bold text-[#9a7a66]">
            Đang lưu mã PIN...
          </p>
        ) : null}
      </BottomSheet>
    </>
  );
}
