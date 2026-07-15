import { ChevronRight, ShoppingBag } from "lucide-react";

import { formatPrice } from "@/lib/utils";

export function CheckoutOrderSummary({
  itemCount,
  totalQuantity,
  productSubtotal,
  discountAmount,
  deliveryFee,
  finalTotal,
  isPickup,
  onViewItems,
}: {
  itemCount: number;
  totalQuantity: number;
  productSubtotal: number;
  discountAmount: number;
  deliveryFee: number;
  finalTotal: number;
  isPickup: boolean;
  onViewItems: () => void;
}) {
  return (
    <section className="rounded-[17px] border border-[#f0dfcc] bg-white p-3 shadow-sm">
      <button
        type="button"
        onClick={onViewItems}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#fff4ec] text-[#b84a39]">
          <ShoppingBag className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-[#3d2417]">
            {totalQuantity} sản phẩm
          </span>
          <span className="mt-0.5 block text-xs font-semibold text-[#7b6254]">
            {itemCount} lựa chọn trong đơn · Xem chi tiết
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-[#b9a79d]" />
      </button>

      <div className="mt-2.5 space-y-1 border-t border-[#f0dfd4] pt-2.5">
        <SummaryRow label="Tạm tính" value={formatPrice(productSubtotal)} />
        {discountAmount > 0 ? (
          <SummaryRow
            label="Voucher"
            value={`-${formatPrice(discountAmount)}`}
            success
          />
        ) : null}
        <SummaryRow
          label={isPickup ? "Phí nhận tại quán" : "Phí vận chuyển"}
          value={deliveryFee === 0 ? "Miễn phí" : formatPrice(deliveryFee)}
        />
        <div className="flex items-center justify-between pt-1.5">
          <span className="text-sm font-black text-[#3d2417]">Tổng cộng</span>
          <span className="text-lg font-black text-[#b84a39]">
            {formatPrice(finalTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs font-semibold text-[#8c7568]">
      <span>{label}</span>
      <span
        className={success ? "font-black text-[#34802f]" : "text-[#3d2417]"}
      >
        {value}
      </span>
    </div>
  );
}
