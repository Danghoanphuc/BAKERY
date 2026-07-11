"use client";

import { useMemo } from "react";
import { Loader2, TicketPercent, X } from "lucide-react";

import { calculateVoucherPricing } from "@/lib/vouchers";
import { formatPrice } from "@/lib/utils";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import {
  getDefaultVoucherUseMode,
  toSelectedCustomerVoucher,
  type CustomerVoucher,
  type SelectableCustomerVoucher,
} from "./customer-vouchers";
import { useAvailableVouchers } from "./useAvailableVouchers";

type CustomerVoucherPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelected?: (voucher: CustomerVoucher) => void;
  subtotal?: number;
};

export function CustomerVoucherPicker({
  isOpen,
  onClose,
  onSelected,
  subtotal,
}: CustomerVoucherPickerProps) {
  const { config } = useOrderConfigStore();
  const { setSelectedVoucher } = useVoucherStore();
  const { vouchers: availableVouchers, isLoading, error } = useAvailableVouchers();
  const vouchers = useMemo(
    () =>
      [...availableVouchers].sort((left, right) => {
        if (subtotal === undefined) return 0;
        return (
          calculateVoucherPricing(subtotal, right).discountAmount -
          calculateVoucherPricing(subtotal, left).discountAmount
        );
      }),
    [availableVouchers, subtotal],
  );

  if (!isOpen) return null;

  function selectVoucher(voucher: CustomerVoucher) {
    const useMode = getDefaultVoucherUseMode(voucher, config.deliveryMode);
    setSelectedVoucher(toSelectedCustomerVoucher(voucher, useMode));
    onSelected?.(voucher);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-[#2e170f]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div className="max-h-[82dvh] w-full max-w-md overflow-hidden rounded-t-[22px] bg-white shadow-xl sm:rounded-[18px]">
        <div className="flex items-start justify-between gap-3 border-b border-[#f0e1d2] px-4 py-3">
          <div>
            <h2 className="text-base font-black text-[#3d2417]">Chọn voucher</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#7b6254]">
              Ưu đãi công khai và ưu đãi thành viên của bạn.
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

        <div className="max-h-[66dvh] overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-[#7b6254]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải ưu đãi...
            </div>
          )}
          {!isLoading && error && (
            <div className="rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
          {!isLoading && !error && vouchers.length === 0 && (
            <div className="rounded-[12px] border border-[#f0e1d2] bg-[#fffaf6] px-3 py-8 text-center text-sm font-semibold text-[#7b6254]">
              Chưa có voucher khả dụng.
            </div>
          )}

          <div className="space-y-2.5">
            {vouchers.map((voucher) => (
              <button
                key={voucher.id}
                type="button"
                onClick={() => selectVoucher(voucher)}
                className="flex w-full gap-3 rounded-[14px] border border-[#f0d8b8] bg-[#fffaf0] p-3 text-left transition hover:border-[#d85d6c] hover:bg-[#fff7f2]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-[#ffc845] text-[#74351f]">
                  <TicketPercent className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-black text-[#3d2417]">
                      {voucher.title}
                    </span>
                    <span className="shrink-0 rounded bg-white px-2 py-0.5 text-[10px] font-black text-[#d85d6c]">
                      {voucher.code}
                    </span>
                  </span>
                  <span className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#7b6254]">
                    {voucher.description}
                  </span>
                  {subtotal !== undefined && (
                    <VoucherEligibility voucher={voucher} subtotal={subtotal} />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VoucherEligibility({
  voucher,
  subtotal,
}: {
  voucher: SelectableCustomerVoucher;
  subtotal: number;
}) {
  const pricing = calculateVoucherPricing(subtotal, voucher);
  return (
    <span className="mt-1 block text-[11px] font-black text-[#b94355]">
      {pricing.isEligible
        ? `Tiết kiệm ${formatPrice(pricing.discountAmount)}`
        : `Cần thêm ${formatPrice(Math.max(0, (voucher.minOrderValue ?? 0) - subtotal))}`}
    </span>
  );
}
