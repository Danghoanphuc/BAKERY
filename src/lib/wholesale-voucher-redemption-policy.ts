import { getVoucherRedemptionUsage } from "@/lib/wholesale-firebase";
import { calculateVoucherPricing } from "@/lib/vouchers";
import type { PublicVoucher, VoucherUseMode } from "@/types/voucher";

type VoucherPolicyInput = {
  voucher: PublicVoucher;
  subtotal: number;
  channel?: VoucherUseMode;
  customerId?: string;
  phone?: string;
};

export async function validateVoucherRedemption({
  voucher,
  subtotal,
  channel,
  customerId,
  phone,
}: VoucherPolicyInput) {
  if (channel && !voucher.channels.includes(channel)) {
    return {
      ok: false as const,
      error: "Voucher này không áp dụng cho hình thức nhận hàng đã chọn.",
    };
  }

  const pricing = calculateVoucherPricing(subtotal, voucher);
  if (!pricing.isEligible) {
    return {
      ok: false as const,
      error: pricing.reason ?? "Đơn chưa đủ điều kiện dùng voucher.",
    };
  }

  if (
    voucher.usageLimit !== undefined &&
    (voucher.usedCount ?? 0) >= voucher.usageLimit
  ) {
    return {
      ok: false as const,
      error: "Voucher này đã hết lượt sử dụng.",
    };
  }

  if (
    voucher.maxDiscountBudget !== undefined &&
    (voucher.discountSpent ?? 0) + pricing.discountAmount >
      voucher.maxDiscountBudget
  ) {
    return {
      ok: false as const,
      error: "Voucher này đã hết ngân sách ưu đãi.",
    };
  }

  const maxUsesPerPhone = Math.max(0, voucher.maxUsesPerPhone ?? 1);
  if (maxUsesPerPhone > 0) {
    const usageCount = await getVoucherRedemptionUsage({
      voucherId: voucher.id,
      voucherCode: voucher.code,
      customerId,
      phone,
    });

    if (usageCount >= maxUsesPerPhone) {
      return {
        ok: false as const,
        error: "Khách này đã dùng voucher này rồi.",
      };
    }
  }

  return { ok: true as const, pricing };
}
