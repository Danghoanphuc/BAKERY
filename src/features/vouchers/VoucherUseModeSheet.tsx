"use client";

import { X } from "lucide-react";

import type { VoucherUseMode } from "@/types/voucher";
import type { CustomerVoucher } from "./customer-vouchers";

type VoucherUseModeSheetProps = {
  voucher: CustomerVoucher | null;
  onClose: () => void;
  onSelect: (voucher: CustomerVoucher, mode: VoucherUseMode) => void;
};

const modeOptions: Array<{
  id: VoucherUseMode;
  title: string;
  description: string;
}> = [
  {
    id: "pos_pickup_now",
    title: "Dùng tại cửa hàng",
    description: "Áp voucher khi mua trực tiếp tại quầy.",
  },
  {
    id: "web_pickup_later",
    title: "Đặt trước - lấy sau",
    description: "Chọn bánh trước, đến tiệm nhận sau.",
  },
  {
    id: "web_delivery",
    title: "Giao tận nơi",
    description: "Áp voucher cho đơn giao hàng.",
  },
];

export function VoucherUseModeSheet({
  voucher,
  onClose,
  onSelect,
}: VoucherUseModeSheetProps) {
  if (!voucher) return null;

  const channels = voucher.channels?.length
    ? voucher.channels
    : modeOptions.map((option) => option.id);

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#f0e1d2] px-4 py-3">
          <div>
            <p className="text-xs font-black uppercase text-[#d85d6c]">
              {voucher.code}
            </p>
            <h2 className="mt-1 text-base font-black text-[#3d2417]">
              Bạn muốn dùng voucher ở đâu?
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#7b6254]">
              {voucher.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#7b6254] hover:bg-[#fff7f2]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2.5 p-4">
          {modeOptions.map((option) => {
            const disabled = !channels.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(voucher, option.id)}
                className="w-full rounded-xl border border-[#f0d8b8] bg-[#fffaf0] px-3 py-3 text-left transition hover:border-[#d85d6c] hover:bg-[#fff7f2] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="block text-sm font-black text-[#3d2417]">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-xs font-semibold leading-5 text-[#7b6254]">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
