import type { MarketingCampaign } from "@/types";
import type {
  PublicVoucher,
  SelectedVoucher,
  VoucherPricing,
  VoucherUseMode,
} from "@/types/voucher";

export const PUBLIC_VOUCHERS: PublicVoucher[] = [
  {
    id: "next-order-public-20",
    code: "BANHNGON20",
    title: "Giảm 20% cho đơn tiếp theo",
    description:
      "Quét mã trên bill hoặc tại quầy để nhận ưu đãi. Dùng được khi mua tại quầy, đặt trước đến lấy hoặc giao tận nơi.",
    discountType: "percent",
    discountValue: 20,
    maxDiscountAmount: 50000,
    minOrderValue: 30000,
    channels: ["pos_pickup_now", "web_pickup_later", "web_delivery"],
    maxUsesPerPhone: 1,
    requiresPhone: true,
    isPublic: true,
  },
  {
    id: "new-member-50",
    code: "THANHVIEN50",
    title: "Voucher thành viên mới giảm 50%",
    description:
      "Ưu đãi tại quầy cho khách lần đầu để thấy ngay số tiền tiết kiệm khi đọc số điện thoại.",
    discountType: "percent",
    discountValue: 50,
    maxDiscountAmount: 60000,
    minOrderValue: 20000,
    channels: ["pos_pickup_now"],
    maxUsesPerPhone: 1,
    requiresPhone: true,
    isPublic: true,
  },
];

export function getPublicVouchers() {
  return PUBLIC_VOUCHERS;
}

export function getVoucherByCode(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  return PUBLIC_VOUCHERS.find(
    (voucher) => voucher.code.toUpperCase() === normalizedCode,
  );
}

export function getVoucherById(id: string) {
  return PUBLIC_VOUCHERS.find((voucher) => voucher.id === id);
}

export function getPublicVouchersFromCampaigns(
  campaigns: MarketingCampaign[],
) {
  const campaignVouchers = campaigns
    .filter((campaign) => campaign.type === "voucher")
    .filter((campaign) => campaign.status === "active")
    .filter((campaign) => campaign.publishing?.isPublic)
    .map(toPublicVoucherFromCampaign)
    .filter((voucher): voucher is PublicVoucher => Boolean(voucher));

  return campaignVouchers.length ? campaignVouchers : PUBLIC_VOUCHERS;
}

export function getVoucherByCodeFromCampaigns(
  code: string,
  campaigns: MarketingCampaign[],
) {
  const normalizedCode = code.trim().toUpperCase();
  const voucher = campaigns
    .filter((campaign) => campaign.type === "voucher")
    .filter((campaign) => campaign.status === "active")
    .map(toPublicVoucherFromCampaign)
    .find(
      (item) => item?.isPublic && item.code.toUpperCase() === normalizedCode,
    );

  return voucher ?? getVoucherByCode(code);
}

export function toSelectedVoucher(
  voucher: PublicVoucher,
  useMode: VoucherUseMode,
): SelectedVoucher {
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

export function calculateVoucherPricing(
  subtotal: number,
  voucher?: Pick<
    SelectedVoucher | PublicVoucher,
    "discountType" | "discountValue" | "maxDiscountAmount" | "minOrderValue"
  > | null,
): VoucherPricing {
  if (!voucher) {
    return {
      subtotal,
      discountAmount: 0,
      totalAfterDiscount: subtotal,
      isEligible: true,
    };
  }

  if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
    return {
      subtotal,
      discountAmount: 0,
      totalAfterDiscount: subtotal,
      isEligible: false,
      reason: `Đơn tối thiểu ${formatCurrency(voucher.minOrderValue)} để dùng voucher.`,
    };
  }

  const rawDiscount =
    voucher.discountType === "percent"
      ? Math.floor((subtotal * voucher.discountValue) / 100)
      : voucher.discountValue;
  const cappedDiscount = voucher.maxDiscountAmount
    ? Math.min(rawDiscount, voucher.maxDiscountAmount)
    : rawDiscount;
  const discountAmount = Math.min(subtotal, Math.max(0, cappedDiscount));

  return {
    subtotal,
    discountAmount,
    totalAfterDiscount: subtotal - discountAmount,
    isEligible: true,
  };
}

function toPublicVoucherFromCampaign(
  campaign: MarketingCampaign,
): PublicVoucher | null {
  if (campaign.discountType !== "percent" && campaign.discountType !== "amount") {
    return null;
  }
  if (campaign.status !== "active") return null;
  if (campaign.startDate && campaign.startDate.getTime() > Date.now()) {
    return null;
  }
  if (campaign.endDate && campaign.endDate.getTime() < Date.now()) {
    return null;
  }
  if (
    campaign.usageLimit !== undefined &&
    campaign.usedCount >= campaign.usageLimit
  ) {
    return null;
  }

  return {
    id: campaign.id,
    code: campaign.code ?? campaign.codePrefix ?? campaign.id,
    title: campaign.title || campaign.name,
    description:
      campaign.customerDescription || campaign.description || campaign.name,
    discountType: campaign.discountType === "percent" ? "percent" : "fixed",
    discountValue: campaign.discountValue,
    maxDiscountAmount:
      campaign.maxDiscountAmount ?? campaign.rules?.maxDiscountAmount,
    minOrderValue: campaign.minOrderValue ?? campaign.rules?.minOrderValue,
    expiresAt: campaign.endDate?.toISOString(),
    channels: campaign.channels ?? [
      "pos_pickup_now",
      "web_pickup_later",
      "web_delivery",
    ],
    maxUsesPerPhone: campaign.rules?.maxUsesPerCustomer ?? 1,
    usageLimit: campaign.usageLimit ?? campaign.voucherBudget?.issuedLimit,
    usedCount: campaign.usedCount,
    maxDiscountBudget: campaign.voucherBudget?.maxBudget ?? campaign.budget,
    discountSpent:
      campaign.metrics?.discountSpent ??
      (typeof campaign.usedCount === "number" ? 0 : undefined),
    requiresPhone: true,
    isPublic: Boolean(campaign.publishing?.isPublic),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
