import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, TicketPercent, X } from "lucide-react";
import { toast } from "sonner";
import type { SelectedVoucher, VoucherPricing } from "@/types/voucher";
import {
  formatCurrency,
  PosCustomer,
  PosVoucherPreview,
} from "../_lib/pos-utils";

type PosVoucherBoxProps = {
  subtotal: number;
  customer: PosCustomer;
  voucherCode: string;
  selectedVoucher?: SelectedVoucher;
  voucherPricing: VoucherPricing;
  onVoucherCodeChange: (value: string) => void;
  onApplyVoucher: (voucher: SelectedVoucher) => void;
  onClearVoucher: () => void;
  onCustomerDetected: (customer: PosCustomer) => void;
};

function toSelectedVoucher(preview: PosVoucherPreview): SelectedVoucher {
  return {
    id: preview.voucher.id,
    code: preview.voucher.code,
    title: preview.voucher.title,
    useMode: "pos_pickup_now",
    discountType: preview.voucher.discountType,
    discountValue: preview.voucher.discountValue,
    maxDiscountAmount: preview.voucher.maxDiscountAmount,
    minOrderValue: preview.voucher.minOrderValue,
  };
}

export function PosVoucherBox({
  subtotal,
  customer,
  voucherCode,
  selectedVoucher,
  voucherPricing,
  onVoucherCodeChange,
  onApplyVoucher,
  onClearVoucher,
  onCustomerDetected,
}: PosVoucherBoxProps) {
  const [bestVoucher, setBestVoucher] = useState<PosVoucherPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const customerKey = customer.id ?? customer.phone;
  const setMessage = (message: string) => toast.error(message);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (subtotal <= 0) {
        setBestVoucher(null);
        return;
      }

      try {
        const response = await fetch("/api/pos/vouchers/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            phone: customer.phone,
            subtotal,
          }),
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          suggestions?: PosVoucherPreview[];
          best?: PosVoucherPreview | null;
        };
        setBestVoucher(data.best ?? null);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("POS voucher suggestions failed:", error);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [customer.id, customer.phone, customerKey, subtotal]);

  const helper = useMemo(() => {
    if (!selectedVoucher) return "Nhập mã hoặc quét QR khách đưa tại quầy.";
    if (!voucherPricing.isEligible && voucherPricing.reason) {
      return voucherPricing.reason;
    }
    return `Đang giảm ${formatCurrency(voucherPricing.discountAmount)}.`;
  }, [selectedVoucher, voucherPricing]);

  async function previewAndApply(input: { code?: string; scanInput?: string }) {
    const value = input.scanInput ?? input.code ?? "";
    if (!value.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/pos/vouchers/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          customerId: customer.id,
          phone: customer.phone,
          subtotal,
        }),
      });
      const data = (await response.json()) as
        | (PosVoucherPreview & {
            customer?: (PosCustomer & { isNew?: boolean }) | null;
          })
        | { error?: string };

      if (!response.ok) {
        setMessage("error" in data ? data.error ?? "Voucher không hợp lệ." : "Voucher không hợp lệ.");
        return;
      }

      const preview = data as PosVoucherPreview;
      const detectedCustomer =
        "customer" in data ? data.customer : undefined;
      if (!customer.id && detectedCustomer?.phone) {
        onCustomerDetected({
          id: detectedCustomer.isNew ? undefined : detectedCustomer.id,
          name: detectedCustomer.name,
          phone: detectedCustomer.phone,
          tier: detectedCustomer.tier,
          loyaltyPoints: detectedCustomer.loyaltyPoints,
          totalOrders: detectedCustomer.totalOrders,
        });
      }
      if (!preview.ok) {
        setMessage(preview.reason ?? "Đơn chưa đủ điều kiện dùng voucher.");
        return;
      }

      onApplyVoucher(toSelectedVoucher(preview));
      onVoucherCodeChange(preview.voucher.code);
      toast.success(`Đã áp voucher ${preview.voucher.code}.`);
    } catch (error) {
      console.error("POS voucher preview failed:", error);
      setMessage("Không thể kiểm tra voucher.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7b6254]">
          Voucher
        </p>
        {bestVoucher?.ok && !selectedVoucher && (
          <button
            type="button"
            onClick={() => {
              onApplyVoucher(toSelectedVoucher(bestVoucher));
              onVoucherCodeChange(bestVoucher.voucher.code);
              toast.success(`Đã áp voucher ${bestVoucher.voucher.code}.`);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-[#fff1f0] px-2.5 py-1 text-xs font-black text-[#b84a39]"
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Áp tốt nhất
          </button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="relative block">
          <TicketPercent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8171]" />
          <input
            type="text"
            value={voucherCode}
            onChange={(event) => onVoucherCodeChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                previewAndApply({ scanInput: voucherCode });
              }
            }}
            placeholder="Nhập hoặc quét mã voucher"
            className="h-10 w-full rounded-xl border border-[#eadbcc] bg-[#fffaf6] pl-10 pr-3 text-sm font-bold text-[#3d2417] outline-none focus:border-[#b84a39]"
          />
        </label>
        <button
          type="button"
          onClick={() => previewAndApply({ scanInput: voucherCode })}
          disabled={isLoading || subtotal <= 0}
          className="h-10 rounded-xl bg-[#b84a39] px-3 text-sm font-black text-white transition hover:bg-[#9e3e2f] disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Áp"}
        </button>
      </div>

      {selectedVoucher && (
        <div className="rounded-xl bg-[#fff1f0] px-3 py-2 text-xs font-semibold text-[#7b6254]">
          <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-[#b84a39]">
                  {selectedVoucher.code}
                </p>
                <p className="truncate">{selectedVoucher.title}</p>
                <p className="mt-1 text-[#7b6254]">{helper}</p>
              </div>
              <button
                type="button"
                onClick={onClearVoucher}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#b84a39] hover:bg-white"
                aria-label="Bỏ voucher"
              >
                <X className="h-4 w-4" />
              </button>
          </div>
        </div>
      )}

    </section>
  );
}
