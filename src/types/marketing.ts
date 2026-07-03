export type MarketingCampaignType =
  | "campaign"
  | "voucher"
  | "loyalty";

export type MarketingCampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "expired";

export type MarketingDiscountType =
  | "percent"
  | "amount"
  | "free_shipping"
  | "points_multiplier";

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

export interface MarketingCampaign {
  id: string;
  name: string;
  type: MarketingCampaignType;
  status: MarketingCampaignStatus;
  code?: string;
  title: string;
  description: string;
  audience: string;
  channel: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  discountType: MarketingDiscountType;
  discountValue: number;
  minOrderValue?: number;
  usageLimit?: number;
  usedCount: number;
  pointsMultiplier?: number;
  isFeatured: boolean;
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
