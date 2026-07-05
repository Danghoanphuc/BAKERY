export type RewardsTab = "journey" | "offers";

export type MyRewardsData = {
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tier: string;
    tierIcon: string;
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
    title: string;
    description: string;
    unlocked: boolean;
  }>;
  badges: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
  }>;
};
