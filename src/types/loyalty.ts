export type LoyaltyVersionStatus = "draft" | "approved" | "scheduled" | "active" | "superseded";
export type LoyaltyRuleTrigger = "order_completed" | "first_order" | "repeat_order" | "birthday" | "profile_completed" | "off_peak";
export type LoyaltyRewardType = "points" | "multiplier" | "voucher" | "gift" | "free_shipping";

export interface LoyaltyTierBenefit {
  id: string;
  type: "points_multiplier" | "voucher" | "free_shipping" | "priority" | "early_access";
  label: string;
  value?: number;
}

export interface LoyaltyPointLedgerEntry {
  id: string;
  customerId: string;
  type: "earn_order" | "bonus_campaign" | "manual_adjustment" | "redeem_reward" | "expire_points" | "refund_order";
  points: number;
  balanceAfter?: number;
  referenceId?: string;
  description: string;
  expiresAt?: Date;
  createdAt: Date;
}

export interface LoyaltyRule {
  id: string;
  name: string;
  trigger: LoyaltyRuleTrigger;
  enabled: boolean;
  amountPerPoint?: number;
  fixedPoints?: number;
  multiplier?: number;
  tierIds?: string[];
  categoryIds?: string[];
  startAt?: Date;
  endAt?: Date;
  priority: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  type: LoyaltyRewardType;
  pointsCost: number;
  value?: number;
  minimumTierId?: string;
  stock?: number;
  validityDays: number;
  enabled: boolean;
}

export interface LoyaltySegment {
  id: string;
  name: string;
  description: string;
  conditions: Array<{ field: "tier" | "points" | "order_count" | "days_since_order" | "lifetime_value"; operator: "eq" | "gte" | "lte"; value: string | number }>;
  estimatedCustomers?: number;
  createdAt?: Date;
}

export interface LoyaltyProgramVersion {
  id: string;
  version: number;
  name: string;
  status: LoyaltyVersionStatus;
  snapshot: Record<string, unknown>;
  note?: string;
  createdAt: Date;
  activatedAt?: Date;
}

export interface LoyaltyAuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  actor: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}
