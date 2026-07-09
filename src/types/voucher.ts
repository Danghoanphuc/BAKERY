export type VoucherDiscountType = "percent" | "fixed";
export type VoucherUseMode = "pos_pickup_now" | "web_pickup_later" | "web_delivery";

export interface PublicVoucher {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  expiresAt?: string;
  channels: VoucherUseMode[];
  maxUsesPerPhone?: number;
  usageLimit?: number;
  usedCount?: number;
  maxDiscountBudget?: number;
  discountSpent?: number;
  requiresPhone: boolean;
  isPublic: boolean;
}

export interface SelectedVoucher {
  id: string;
  code: string;
  title: string;
  useMode: VoucherUseMode;
  discountType: VoucherDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderValue?: number;
}

export interface VoucherPricing {
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  isEligible: boolean;
  reason?: string;
}
