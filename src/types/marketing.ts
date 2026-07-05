export type MarketingCampaignType = "campaign" | "voucher" | "loyalty";

export type MarketingCampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "expired";

export type MarketingDiscountType =
  | "percent"
  | "amount"
  | "gift_item"
  | "free_shipping"
  | "buy_x_get_y"
  | "points_multiplier";

export type VoucherProgramGoal =
  | "new_customer"
  | "returning_customer"
  | "birthday"
  | "preorder"
  | "happy_hour"
  | "custom";

export type VoucherAudience =
  | "all"
  | "new_customers"
  | "existing_customers"
  | "inactive_customers"
  | "birthday_customers"
  | "specific_customers"
  | "after_purchase";

export type VoucherUseChannel =
  | "pos_pickup_now"
  | "web_pickup_later"
  | "web_delivery";

export type VoucherBudgetMode = "quantity" | "budget" | "both";

export type VoucherIssueMethod =
  | "public"
  | "auto_after_order"
  | "manual_phone"
  | "segment"
  | "print";

export type VoucherApplicationScope =
  | "entire_order"
  | "specific_products"
  | "specific_categories";

export interface TierSetting {
  id: string;
  name: string;
  threshold: number;
  icon: string;
  benefit: string;
}

export interface MarketingSettings {
  id: string;
  pointsPerAmount: number;
  birthdayVoucherEnabled: boolean;
  birthdayVoucherTitle: string;
  birthdayVoucherDescription: string;
  tiers: TierSetting[];
  updatedAt?: Date;
}

export interface VoucherRules {
  maxDiscountAmount?: number;
  minOrderValue?: number;
  applicationScope: VoucherApplicationScope;
  productIds?: string[];
  categoryIds?: string[];
  validDaysAfterIssue?: number;
  maxUsesPerCustomer: number;
  stackable: boolean;
  advanced?: {
    timeWindows?: string[];
    branchIds?: string[];
    weekdays?: number[];
  };
}

export interface VoucherBudget {
  mode: VoucherBudgetMode;
  issuedLimit?: number;
  maxBudget?: number;
  maxDiscountPerVoucher?: number;
}

export interface VoucherMetrics {
  issuedCount: number;
  redeemedCount: number;
  discountSpent: number;
  revenueGenerated: number;
}

export interface VoucherPublishing {
  issueMethods: VoucherIssueMethod[];
  isPublic: boolean;
  autoIssueAfterOrder: boolean;
  printOnBill: boolean;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: MarketingCampaignType;
  status: MarketingCampaignStatus;
  code?: string;
  codePrefix?: string;
  title: string;
  description: string;
  internalDescription?: string;
  customerDescription?: string;
  audience: string;
  audienceType?: VoucherAudience;
  channel: string;
  channels?: VoucherUseChannel[];
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  discountType: MarketingDiscountType;
  discountValue: number;
  giftProductId?: string;
  buyQuantity?: number;
  getQuantity?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount: number;
  pointsMultiplier?: number;
  isFeatured: boolean;
  programGoal?: VoucherProgramGoal;
  rules?: VoucherRules;
  voucherBudget?: VoucherBudget;
  metrics?: VoucherMetrics;
  publishing?: VoucherPublishing;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MarketingCampaignInput = Omit<
  MarketingCampaign,
  "id" | "createdAt" | "updatedAt"
>;

export type MarketingSettingsInput = Omit<
  MarketingSettings,
  "id" | "updatedAt"
>;
