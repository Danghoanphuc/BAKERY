"use client";

import { useMemo, useState } from "react";
import { ChevronRight, TicketPercent, Truck } from "lucide-react";

import { CustomerVoucherPicker } from "@/features/vouchers";
import {
  getDefaultVoucherUseMode,
  toSelectedCustomerVoucher,
} from "@/features/vouchers/customer-vouchers";
import { useAvailableVouchers } from "@/features/vouchers/useAvailableVouchers";
import { STANDARD_DELIVERY_FEE, getShippingBenefit } from "@/lib/order-pricing";
import { formatPrice } from "@/lib/utils";
import { calculateVoucherPricing } from "@/lib/vouchers";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { useVoucherStore } from "@/store/voucherStore";

export function ProductOffers({ productTotal }: { productTotal: number }) {
  const cartTotal = useCartStore((state) => state.totalPrice);
  const { config } = useOrderConfigStore();
  const { selectedVoucher, setSelectedVoucher } = useVoucherStore();
  const { vouchers, isLoading } = useAvailableVouchers();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const projectedSubtotal = cartTotal + productTotal;
  const shipping = getShippingBenefit(projectedSubtotal, config.deliveryMode);

  const bestVoucher = useMemo(
    () =>
      vouchers
        .map((voucher) => ({
          voucher,
          pricing: calculateVoucherPricing(projectedSubtotal, voucher),
        }))
        .filter((item) => item.pricing.isEligible && item.pricing.discountAmount > 0)
        .sort((left, right) => right.pricing.discountAmount - left.pricing.discountAmount)[0],
    [projectedSubtotal, vouchers],
  );
  const nearestVoucher = useMemo(
    () =>
      vouchers
        .filter((voucher) => (voucher.minOrderValue ?? 0) > projectedSubtotal)
        .sort(
          (left, right) =>
            (left.minOrderValue ?? 0) - (right.minOrderValue ?? 0),
        )[0],
    [projectedSubtotal, vouchers],
  );

  const applyBestVoucher = () => {
    if (!bestVoucher) return;
    const mode = getDefaultVoucherUseMode(bestVoucher.voucher, config.deliveryMode);
    setSelectedVoucher(toSelectedCustomerVoucher(bestVoucher.voucher, mode));
  };

  return (
    <section aria-labelledby="product-offers-title">
      <div className="mb-2 flex items-center justify-between">
        <h4 id="product-offers-title" className="text-sm font-black text-[#3d2417]">
          Ưu đãi cho đơn này
        </h4>
        {vouchers.length > 1 && (
          <button
            type="button"
            onClick={() => setIsPickerOpen(true)}
            className="text-[11px] font-black text-[#bd4656]"
          >
            Xem tất cả
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#f0dfd4] bg-white">
        <div className="flex min-h-[58px] items-center gap-3 px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#fff0f2] text-[#b84a39]">
            <TicketPercent className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black text-[#3d2417]">
              {selectedVoucher
                ? `${selectedVoucher.code} đã được chọn`
                : bestVoucher
                  ? `${bestVoucher.voucher.code} · Giảm ${formatPrice(bestVoucher.pricing.discountAmount)}`
                  : nearestVoucher
                    ? `Mua thêm ${formatPrice((nearestVoucher.minOrderValue ?? 0) - projectedSubtotal)} để dùng ${nearestVoucher.code}`
                    : isLoading
                      ? "Đang tìm ưu đãi phù hợp"
                      : "Chưa có voucher phù hợp"}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-[#8c7568]">
              {selectedVoucher
                ? "Voucher được tính trên toàn bộ giỏ hàng"
                : bestVoucher?.voucher.title ?? "Ưu đãi được xét theo giá trị giỏ"}
            </p>
          </div>
          {selectedVoucher ? (
            <button
              type="button"
              onClick={() => setIsPickerOpen(true)}
              className="shrink-0 text-xs font-black text-[#bd4656]"
            >
              Đổi
            </button>
          ) : bestVoucher ? (
            <button
              type="button"
              onClick={applyBestVoucher}
              className="shrink-0 rounded-full bg-[#fff0f2] px-3 py-1.5 text-xs font-black text-[#bd4656]"
            >
              Áp dụng
            </button>
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-[#b49d90]" />
          )}
        </div>

        <div className="h-px bg-[#f3e6dc]" />

        <div className="flex min-h-[58px] items-center gap-3 px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#eaf8f5] text-[#278477]">
            <Truck className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[#254f49]">
              {config.deliveryMode === "pickup"
                ? "Nhận tại quán không mất phí"
                : shipping.isFree
                  ? "Đã đạt miễn phí giao hàng"
                  : `Mua thêm ${formatPrice(shipping.remainingForFreeShipping)} để freeship`}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#66847f]">
              {config.deliveryMode === "pickup"
                ? "Không áp dụng phí vận chuyển"
                : shipping.isFree
                  ? `Tiết kiệm ${formatPrice(STANDARD_DELIVERY_FEE)} phí giao hàng`
                  : "Tự động áp dụng khi giỏ đủ điều kiện"}
            </p>
          </div>
        </div>
      </div>

      <CustomerVoucherPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        subtotal={projectedSubtotal}
      />
    </section>
  );
}
