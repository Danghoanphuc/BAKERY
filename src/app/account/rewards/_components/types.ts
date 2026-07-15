export type RewardsTab = "journey" | "offers";

export type MyRewardsData = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tier: string;
    tierIcon: string;
    tierImageUrl?: string;
  };
  points: {
    current: number;
    totalEarned: number;
    neededForNextTier: number;
    progressPercent: number;
  };
  journey: {
    currentTierId: string;
    nextTierId: string | null;
    tiers: Array<{
      id: string;
      name: string;
      threshold: number;
      icon: string;
      imageUrl?: string;
      benefit: string;
      unlocked: boolean;
    }>;
  };
  totals: {
    orderCount: number;
    lifetimeValue: number;
    favoriteProduct: string;
    favoriteQuantity: number;
  };
  vouchers: Array<{
    id: string;
    code?: string;
    title: string;
    description: string;
    unlocked: boolean;
    discountType?: "percent" | "fixed";
    discountValue?: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
    channels?: Array<"pos_pickup_now" | "web_pickup_later" | "web_delivery">;
  }>;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }>;
  rewardCatalog: Array<{
    id: string;
    name: string;
    description?: string;
    type: "points" | "multiplier" | "voucher" | "gift" | "free_shipping";
    pointsCost: number;
    value?: number;
    imageUrl?: string;
    validityDays: number;
    stock?: number;
    enabled: boolean;
  }>;
  pointHistory: Array<{
    id: string;
    type: "earn_order" | "bonus_campaign" | "manual_adjustment" | "redeem_reward" | "expire_points" | "refund_order";
    points: number;
    balanceAfter?: number;
    referenceId?: string;
    description: string;
    expiresAt?: string;
    createdAt: string;
  }>;
};
