import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Loader2, QrCode, ScanLine, TicketPercent, X } from "lucide-react";
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
  const [scanInput, setScanInput] = useState("");
  const [suggestions, setSuggestions] = useState<PosVoucherPreview[]>([]);
  const [bestVoucher, setBestVoucher] = useState<PosVoucherPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const customerKey = customer.id ?? customer.phone;

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      if (subtotal <= 0) {
        setSuggestions([]);
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
        setSuggestions(data.suggestions ?? []);
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
      setMessage(null);
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
      setScanInput("");
      setMessage(null);
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
            }}
            className="inline-flex items-center gap-1 rounded-full bg-[#fff1f0] px-2.5 py-1 text-xs font-black text-[#d85d6c]"
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
                previewAndApply({ code: voucherCode });
              }
            }}
            placeholder="Nhập mã"
            className="h-10 w-full rounded-xl border border-[#eadbcc] bg-[#fffaf6] pl-10 pr-3 text-sm font-bold text-[#3d2417] outline-none focus:border-[#d85d6c]"
          />
        </label>
        <button
          type="button"
          onClick={() => previewAndApply({ code: voucherCode })}
          disabled={isLoading || subtotal <= 0}
          className="h-10 rounded-xl bg-[#d85d6c] px-3 text-sm font-black text-white transition hover:bg-[#c94f60] disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Áp"}
        </button>
      </div>

      <label className="relative block">
        <ScanLine className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8171]" />
        <input
          type="text"
          value={scanInput}
          onChange={(event) => setScanInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              previewAndApply({ scanInput });
            }
          }}
          placeholder="Quét QR voucher tại đây"
          className="h-10 w-full rounded-xl border border-dashed border-[#e6b8ac] bg-white pl-10 pr-10 text-sm font-bold text-[#3d2417] outline-none focus:border-[#d85d6c]"
        />
        <QrCode className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#d85d6c]" />
      </label>

      {(selectedVoucher || message) && (
        <div className="rounded-xl bg-[#fff1f0] px-3 py-2 text-xs font-semibold text-[#7b6254]">
          {selectedVoucher ? (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-black text-[#d85d6c]">
                  {selectedVoucher.code}
                </p>
                <p className="truncate">{selectedVoucher.title}</p>
                <p className="mt-1 text-[#7b6254]">{helper}</p>
              </div>
              <button
                type="button"
                onClick={onClearVoucher}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#d85d6c] hover:bg-white"
                aria-label="Bỏ voucher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="font-bold text-red-600">{message}</p>
          )}
        </div>
      )}

      {!selectedVoucher && suggestions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.slice(0, 3).map((preview) => (
            <button
              key={preview.voucher.id}
              type="button"
              onClick={() => {
                if (preview.ok) {
                  onApplyVoucher(toSelectedVoucher(preview));
                  onVoucherCodeChange(preview.voucher.code);
                } else {
                  setMessage(preview.reason ?? "Voucher chưa đủ điều kiện.");
                }
              }}
              className="min-w-[150px] rounded-xl border border-[#eadbcc] bg-white px-3 py-2 text-left transition hover:border-[#d85d6c]/50"
            >
              <p className="truncate text-xs font-black text-[#d85d6c]">
                {preview.voucher.code}
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-[#3d2417]">
                {preview.ok
                  ? `Giảm ${formatCurrency(preview.estimatedDiscount)}`
                  : preview.reason}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
