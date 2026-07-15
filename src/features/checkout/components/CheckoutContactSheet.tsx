import { CheckCircle2, Fingerprint, Loader2, LockKeyhole } from "lucide-react";

import { BottomSheet } from "@/components/common";
import type { CheckoutIdentityStatus } from "@/features/checkout/useCheckoutIdentity";

export type CheckoutContactForm = {
  name: string;
  phone: string;
};

type CheckoutContactSheetProps = {
  isOpen: boolean;
  value: CheckoutContactForm;
  onChange: (value: CheckoutContactForm) => void;
  onClose: () => void;
  identityStatus?: CheckoutIdentityStatus;
  pin?: string;
  identityError?: string | null;
  onPinChange?: (pin: string) => void;
  onSignIn?: () => Promise<boolean>;
  passkeyAvailable?: boolean;
  onPasskeySignIn?: () => Promise<boolean>;
};

export function CheckoutContactSheet({
  isOpen,
  value,
  onChange,
  onClose,
  identityStatus = "idle",
  pin = "",
  identityError,
  onPinChange,
  onSignIn,
  passkeyAvailable = false,
  onPasskeySignIn,
}: CheckoutContactSheetProps) {
  const needsPin =
    identityStatus === "pin_required" || identityStatus === "signing_in";
  const canComplete =
    Boolean(value.name.trim()) &&
    value.phone.length === 10 &&
    !needsPin &&
    identityStatus !== "checking";

  async function handlePrimaryAction() {
    if (needsPin && onSignIn) {
      const signedIn = await onSignIn();
      if (signedIn) onClose();
      return;
    }
    onClose();
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Thông tin người nhận"
      contentClassName="px-4 pb-5"
      footer={
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={
            needsPin
              ? pin.length !== 4 || identityStatus === "signing_in"
              : !canComplete
          }
          className="h-12 w-full rounded-[14px] bg-[#b84a39] text-sm font-black text-white disabled:bg-[#d8c8bd]"
        >
          {identityStatus === "signing_in" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Đang xác minh
            </span>
          ) : needsPin ? (
            "Xác minh và tiếp tục"
          ) : (
            "Hoàn tất"
          )}
        </button>
      }
    >
      <div className="pb-2 pt-1">
        <h2 className="text-lg font-black text-[#3d2417]">
          Thông tin người nhận
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#7b6254]">
          Tiệm sử dụng thông tin này để xác nhận và giao đơn.
        </p>
      </div>
      <div className="mt-3 space-y-3">
        <ContactField
          label="Họ tên"
          name="name"
          autoComplete="name"
          value={value.name}
          onChange={(name) => onChange({ ...value, name })}
        />
        <ContactField
          label="Số điện thoại"
          name="tel"
          autoComplete="tel"
          value={value.phone}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          onChange={(phone) => onChange({ ...value, phone })}
        />

        {identityStatus === "checking" ? (
          <p className="flex items-center gap-2 text-xs font-bold text-[#8a7062]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang nhận diện thông tin...
          </p>
        ) : null}

        {needsPin ? (
          <div className="rounded-[14px] border border-[#efd7c7] bg-[#fff8f1] p-3">
            <div className="flex gap-2.5">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#b84a39]" />
              <div>
                <p className="text-sm font-black text-[#56372a]">
                  Xác minh để dùng thông tin đã lưu
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#866d60]">
                  Nhập PIN 4 số. Bạn chỉ cần làm bước này một lần trên thiết bị.
                </p>
              </div>
            </div>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              value={pin}
              onChange={(event) => onPinChange?.(event.target.value)}
              placeholder="••••"
              aria-label="Mã PIN 4 số"
              className="mt-3 h-11 w-full rounded-[12px] border border-[#e5cbbb] bg-white px-3 text-center text-lg font-black tracking-[0.45em] outline-none focus:border-[#b84a39] focus:ring-2 focus:ring-[#b84a39]/15"
            />
            {passkeyAvailable && onPasskeySignIn ? (
              <button
                type="button"
                disabled={identityStatus === "signing_in"}
                onClick={async () => {
                  const signedIn = await onPasskeySignIn();
                  if (signedIn) onClose();
                }}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#dfc8b9] bg-white text-sm font-black text-[#7a4b31] disabled:opacity-60"
              >
                <Fingerprint className="h-4 w-4" />
                Dùng Face ID / vân tay
              </button>
            ) : null}
          </div>
        ) : identityStatus === "authenticated" ? (
          <p className="flex items-center gap-2 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Thông tin thành viên đã được nhận diện
          </p>
        ) : null}

        {identityError ? (
          <p role="alert" className="text-xs font-bold text-red-700">
            {identityError}
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

function ContactField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  maxLength,
  name,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric";
  maxLength?: number;
  name?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-black text-[#65483a]">
      {label} <span className="text-[#b84a39]">*</span>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        name={name}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-12 w-full rounded-[14px] border border-[#eadbcc] px-3 text-sm font-semibold outline-none focus:border-[#b84a39] focus:ring-2 focus:ring-[#b84a39]/15"
      />
    </label>
  );
}
