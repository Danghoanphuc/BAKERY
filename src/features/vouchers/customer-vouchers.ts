import type { SelectedVoucher, VoucherUseMode } from "@/types/voucher";

export type CustomerVoucher = {
  id: string;
  code?: string;
  title: string;
  description: string;
  unlocked: boolean;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  channels?: VoucherUseMode[];
  maxUsesPerPhone?: number;
};

export type SelectableCustomerVoucher = CustomerVoucher & {
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
};

export type CustomerRewardsPayload = {
  vouchers?: CustomerVoucher[];
};

export function getSelectableCustomerVouchers(
  payload: CustomerRewardsPayload | null,
) {
  return (payload?.vouchers ?? []).filter(isSelectableVoucher);
}

export function isSelectableVoucher(
  voucher: CustomerVoucher,
): voucher is SelectableCustomerVoucher {
  return Boolean(
    voucher.unlocked &&
      voucher.code &&
      voucher.discountType &&
      typeof voucher.discountValue === "number",
  );
}

export function getDefaultVoucherUseMode(
  voucher: CustomerVoucher,
  deliveryMode: "delivery" | "pickup",
): VoucherUseMode {
  const preferredMode =
    deliveryMode === "pickup" ? "web_pickup_later" : "web_delivery";
  const channels: VoucherUseMode[] = voucher.channels?.length
    ? voucher.channels
    : ["web_pickup_later", "web_delivery"];

  if (channels.includes(preferredMode)) return preferredMode;
  if (channels.includes("web_pickup_later")) return "web_pickup_later";
  if (channels.includes("web_delivery")) return "web_delivery";
  return channels[0] ?? preferredMode;
}

export function toSelectedCustomerVoucher(
  voucher: CustomerVoucher,
  useMode: VoucherUseMode,
): SelectedVoucher {
  if (!voucher.code || !voucher.discountType || voucher.discountValue === undefined) {
    throw new Error("Voucher is missing required selection fields.");
  }

  return {
    id: voucher.id,
    code: voucher.code,
    title: voucher.title,
    useMode,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    maxDiscountAmount: voucher.maxDiscountAmount,
    minOrderValue: voucher.minOrderValue,
  };
}
