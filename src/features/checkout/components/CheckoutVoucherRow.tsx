import { ChevronRight, TicketPercent, X } from "lucide-react";

import { formatPrice } from "@/lib/utils";

type CheckoutVoucherRowProps = {
  code?: string;
  title?: string;
  discountAmount: number;
  eligibilityReason?: string;
  isEligible: boolean;
  onChoose: () => void;
  onClear: () => void;
};

export function CheckoutVoucherRow({
  code,
  title,
  discountAmount,
  eligibilityReason,
  isEligible,
  onChoose,
  onClear,
}: CheckoutVoucherRowProps) {
  return (
    <section className="rounded-[17px] border border-[#f0d6aa] bg-[#fffaf0] p-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#ffc845] text-[#74351f]">
          <TicketPercent className="h-5 w-5" />
        </span>
        <button
          type="button"
          onClick={onChoose}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#9a6d3d]">
            Voucher
          </span>
          <span className="mt-0.5 block truncate text-sm font-black text-[#3d2417]">
            {code ? `${code} · ${title}` : "Chọn voucher để nhận ưu đãi"}
          </span>
          {code ? (
            <span
              className={`mt-0.5 block text-xs font-bold ${isEligible ? "text-[#34802f]" : "text-red-700"}`}
            >
              {isEligible
                ? `Tiết kiệm ${formatPrice(discountAmount)}`
                : eligibilityReason}
            </span>
          ) : null}
        </button>
        {code ? (
          <button
            type="button"
            onClick={onClear}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#9b8171] hover:bg-white"
            aria-label="Bỏ voucher"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onChoose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[#9a6d3d]"
          aria-label={code ? "Đổi voucher" : "Chọn voucher"}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
