export type MarketingCampaignType = "campaign" | "voucher" | "loyalty";

export type MarketingCampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "paused"
  | "expired"
  | "completed"
  | "archived";

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
  imageUrl?: string;
  benefit: string;
  benefits?: import("./loyalty").LoyaltyTierBenefit[];
  maintenanceThreshold?: number;
  evaluationPeriodMonths?: number;
  gracePeriodDays?: number;
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
  availableCount?: number;
  redeemedCount: number;
  expiredCount?: number;
  discountSpent: number;
  revenueGenerated: number;
}

export interface VoucherPublishing {
  issueMethods: VoucherIssueMethod[];
  isPublic: boolean;
  autoIssueAfterOrder: boolean;
  printOnBill: boolean;
}

export interface VoucherAiStrategy {
  objective?: string;
  selectedApproach?: string | null;
  assumptions?: string[];
  warnings?: string[];
  lastSummary?: string;
  lastModelTier?: "luna" | "terra" | "sol" | null;
  dataSnapshot?: Record<string, unknown>;
  scenarios?: Array<Record<string, unknown>>;
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
  aiStrategy?: VoucherAiStrategy;
  activeVersionId?: string;
  version?: number;
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
