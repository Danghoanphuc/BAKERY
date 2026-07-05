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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
