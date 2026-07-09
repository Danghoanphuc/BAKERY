import { useMemo } from "react";
import { Banknote, QrCode, RefreshCw } from "lucide-react";
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
  isPayOSEnabled: boolean;
  onPaymentMethodChange: (method: PosPaymentMethod) => void;
  onSubmit: () => void;
  children?: React.ReactNode;
};

export function PosCheckoutPanel({
  selectedVoucher,
  voucherPricing,
  paymentMethod,
  canSubmit,
  isSubmitting,
  isPayOSEnabled,
  onPaymentMethodChange,
  onSubmit,
  children,
}: PosCheckoutPanelProps) {
  const finalTotal =
    selectedVoucher && voucherPricing.isEligible
      ? voucherPricing.totalAfterDiscount
      : voucherPricing.subtotal;

  const availablePaymentMethods = useMemo(() => {
    return paymentMethods.filter(
      (method) => method.value !== "bank_transfer" || isPayOSEnabled,
    );
  }, [isPayOSEnabled]);

  return (
    <section className="flex min-h-full flex-col gap-3 p-4">
      {children}

      <div className="grid grid-cols-2 gap-2">
        {availablePaymentMethods.map((method) => {
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
                  ? "border-[#d85d6c] bg-[#fff1f0] text-[#d85d6c]"
                  : "border-[#eadbcc] bg-white text-[#7b6254] hover:border-[#d85d6c]/40",
              )}
            >
              <Icon className="h-4 w-4" />
              {method.label}
            </button>
          );
        })}
      </div>

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
          <span className="text-[#d85d6c]">{formatCurrency(finalTotal)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d85d6c] text-sm font-black text-white shadow-[0_10px_22px_rgba(216,93,108,0.25)] transition hover:bg-[#c94f60] disabled:cursor-not-allowed disabled:opacity-50"
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
