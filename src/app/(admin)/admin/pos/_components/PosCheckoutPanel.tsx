import { Banknote, MessageSquare, QrCode, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import type { SelectedVoucher, VoucherPricing } from "@/types/voucher";
import { formatCurrency, PosPaymentMethod } from "../_lib/pos-utils";

const paymentMethods: Array<{
  value: PosPaymentMethod;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "cash", label: "Tiền mặt", icon: Banknote },
  { value: "bank_transfer", label: "QR/CK", icon: QrCode },
];

type PosCheckoutPanelProps = {
  selectedVoucher?: SelectedVoucher;
  voucherPricing: VoucherPricing;
  paymentMethod: PosPaymentMethod;
  canSubmit: boolean;
  isSubmitting: boolean;
  cashReceived: number;
  orderNote: string;
  onCashReceivedChange: (value: number) => void;
  onPaymentMethodChange: (method: PosPaymentMethod) => void;
  onOrderNoteChange: (value: string) => void;
  onSubmit: () => void;
  children?: React.ReactNode;
};

export function PosCheckoutPanel({
  selectedVoucher,
  voucherPricing,
  paymentMethod,
  canSubmit,
  isSubmitting,
  cashReceived,
  orderNote,
  onCashReceivedChange,
  onPaymentMethodChange,
  onOrderNoteChange,
  onSubmit,
  children,
}: PosCheckoutPanelProps) {
  const finalTotal =
    selectedVoucher && voucherPricing.isEligible
      ? voucherPricing.totalAfterDiscount
      : voucherPricing.subtotal;

  return (
    <section className="flex min-h-full flex-col gap-3 p-4">
      {children}

      <div className="grid grid-cols-2 gap-2">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const active = paymentMethod === method.value;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onPaymentMethodChange(method.value)}
              className={clsx(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-black transition",
                active
                  ? "border-[#b84a39] bg-[#fff1f0] text-[#b84a39]"
                  : "border-[#eadbcc] bg-white text-[#7b6254] hover:border-[#b84a39]/40",
              )}
            >
              <Icon className="h-4 w-4" />
              {method.label}
            </button>
          );
        })}
      </div>

      {paymentMethod === "cash" && (
        <div className="rounded-2xl border border-[#eadbcc] bg-white p-3">
          <span className="text-xs font-black text-[#65483a]">
            Khách đưa
          </span>
          <input
            type="number"
            min={0}
            step={1000}
            value={cashReceived || ""}
            onChange={(event) =>
              onCashReceivedChange(Number(event.target.value) || 0)
            }
            placeholder={formatCurrency(finalTotal)}
            className="mt-2 h-11 w-full rounded-xl border border-[#eadbcc] px-3 text-right text-base font-black outline-none focus:border-[#b84a39]"
          />
          <button
            type="button"
            onClick={() => onCashReceivedChange(finalTotal)}
            className="mt-2 flex h-9 w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 transition hover:bg-emerald-100"
          >
            Đúng {formatCurrency(finalTotal)}
          </button>
          <span className="mt-2 flex justify-between text-xs font-bold text-[#7b6254]">
            <span>Tiền thừa</span>
            <strong className="text-emerald-700">
              {formatCurrency(Math.max(0, cashReceived - finalTotal))}
            </strong>
          </span>
        </div>
      )}

      <label className="block rounded-2xl border border-[#eadbcc] bg-white p-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-[#9b8171]" />
          <span className="text-xs font-black text-[#65483a]">
            Ghi chú đơn
          </span>
        </div>
        <textarea
          value={orderNote}
          onChange={(event) => onOrderNoteChange(event.target.value)}
          placeholder="Thêm ghi chú cho đơn hàng..."
          rows={2}
          className="mt-2 w-full resize-none rounded-xl border border-[#eadbcc] px-3 py-2 text-sm font-semibold text-[#3d2417] outline-none placeholder:text-[#b49a8a] focus:border-[#b84a39]"
        />
      </label>

      <div className="mt-auto space-y-2 rounded-2xl bg-[#fffaf6] p-3 ring-1 ring-[#f0e1d2]">
        {selectedVoucher && voucherPricing.isEligible && (
          <>
            <PriceRow label="Tạm tính" value={voucherPricing.subtotal} muted />
            <PriceRow
              label="Giảm giá"
              value={-voucherPricing.discountAmount}
              muted
            />
          </>
        )}
        <div className="flex items-center justify-between text-xl font-black text-[#3d2417]">
          <span>Tổng tiền</span>
          <span className="text-[#b84a39]">{formatCurrency(finalTotal)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#b84a39] text-sm font-black text-white shadow-[0_10px_22px_rgba(184,74,57,0.25)] transition hover:bg-[#9e3e2f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Banknote className="h-4 w-4" />
        )}
        {isSubmitting ? "Đang xử lý" : "Thanh toán"}
      </button>
    </section>
  );
}

function PriceRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between text-sm font-bold",
        muted ? "text-[#7b6254]" : "text-[#3d2417]",
      )}
    >
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}
