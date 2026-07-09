"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, TicketPercent, X } from "lucide-react";

import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";
import {
  getDefaultVoucherUseMode,
  getSelectableCustomerVouchers,
  toSelectedCustomerVoucher,
  type CustomerRewardsPayload,
  type CustomerVoucher,
} from "./customer-vouchers";

type CustomerVoucherPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelected?: (voucher: CustomerVoucher) => void;
};

export function CustomerVoucherPicker({
  isOpen,
  onClose,
  onSelected,
}: CustomerVoucherPickerProps) {
  const { config } = useOrderConfigStore();
  const { setSelectedVoucher } = useVoucherStore();
  const [payload, setPayload] = useState<CustomerRewardsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || payload) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch("/api/rewards")
      .then(async (response) => {
        if (response.status === 401) {
          throw new Error("unauthorized");
        }
        if (!response.ok) throw new Error("load_failed");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error && err.message === "unauthorized"
              ? "Bạn cần đăng nhập để dùng voucher của mình."
              : "Chưa tải được voucher. Vui lòng thử lại.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, payload]);

  const vouchers = useMemo(
    () => getSelectableCustomerVouchers(payload),
    [payload],
  );

  if (!isOpen) return null;

  function selectVoucher(voucher: CustomerVoucher) {
    const useMode = getDefaultVoucherUseMode(voucher, config.deliveryMode);
    setSelectedVoucher(toSelectedCustomerVoucher(voucher, useMode));
    onSelected?.(voucher);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <div className="max-h-[82vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#f0e1d2] px-4 py-3">
          <div>
            <h2 className="text-base font-black text-[#3d2417]">
              Chọn voucher
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#7b6254]">
              Voucher sẽ được áp ngay cho đơn hiện tại.
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

        <div className="max-h-[62vh] overflow-y-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm font-semibold text-[#7b6254]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang tải voucher...
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {!isLoading && !error && vouchers.length === 0 && (
            <div className="rounded-lg border border-[#f0e1d2] bg-[#fffaf6] px-3 py-8 text-center text-sm font-semibold text-[#7b6254]">
              Bạn chưa có voucher khả dụng.
            </div>
          )}

          <div className="space-y-2.5">
            {vouchers.map((voucher) => (
              <button
                key={voucher.id}
                type="button"
                onClick={() => selectVoucher(voucher)}
                className="flex w-full gap-3 rounded-xl border border-[#f0d8b8] bg-[#fffaf0] p-3 text-left transition hover:border-[#d85d6c] hover:bg-[#fff7f2]"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#ffc845] text-[#74351f]">
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
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
