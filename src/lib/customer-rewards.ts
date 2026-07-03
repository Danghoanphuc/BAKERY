import type { Customer, MarketingCampaign, MarketingSettings, Order } from "@/types";
import { defaultMarketingSettings } from "@/lib/firebase/marketing";

const completedStatuses = new Set(["completed", "delivered"]);

export const rewardTiers = defaultMarketingSettings.tiers;

export function orderMatchesCustomer(
  order: Order,
  customer: { phone: string; email?: string },
) {
  const orderEmail = order.customerEmail?.trim().toLowerCase();
  const customerEmail = customer.email?.trim().toLowerCase();

  return (
    order.customerPhone.trim() === customer.phone.trim() ||
    Boolean(orderEmail && customerEmail && orderEmail === customerEmail)
  );
}

function getFavoriteItem(orders: Order[]) {
  const itemCounts = new Map<string, { name: string; quantity: number }>();

  for (const order of orders) {
    for (const item of order.items) {
      const current = itemCounts.get(item.productId) ?? {
        name: item.productName,
        quantity: 0,
      };
      current.quantity += item.quantity;
      itemCounts.set(item.productId, current);
    }
  }

  return [...itemCounts.values()].sort((a, b) => b.quantity - a.quantity)[0] ?? {
    name: "Chưa có",
    quantity: 0,
  };
}

function hasNightOrder(orders: Order[]) {
  return orders.some((order) => new Date(order.createdAt).getHours() >= 18);
}

function getUnlockedBadges(orders: Order[], totalValue: number) {
  const favorite = getFavoriteItem(orders);
  const cakeOrders = orders.filter((order) =>
    order.items.some((item) => /bánh|cake/i.test(item.productName)),
  );

  return [
    {
      id: "seasonal",
      title: "Thánh Bắt Trend",
      description: "Mua bánh theo mùa",
      icon: "🍰",
      unlocked: orders.length >= 1,
    },
    {
      id: "party",
      title: "Người Hùng Tiệc Tùng",
      description: "Hay mua bánh kem size lớn",
      icon: "🎂",
      unlocked: cakeOrders.length >= 2 || totalValue >= 1000000,
    },
    {
      id: "night",
      title: "Cú Đêm",
      description: "Hay order buổi tối",
      icon: "🌙",
      unlocked: hasNightOrder(orders),
    },
    {
      id: "favorite",
      title: "Món Ruột",
      description: favorite.quantity
        ? `Đã mua ${favorite.name}`
        : "Có món yêu thích đầu tiên",
      icon: "🥐",
      unlocked: favorite.quantity >= 3,
    },
  ];
}

function isCampaignActive(campaign: MarketingCampaign, now = new Date()) {
  if (campaign.status !== "active") return false;
  if (campaign.startDate && campaign.startDate.getTime() > now.getTime()) {
    return false;
  }
  if (campaign.endDate && campaign.endDate.getTime() < now.getTime()) {
    return false;
  }
  if (
    campaign.usageLimit !== undefined &&
    campaign.usedCount >= campaign.usageLimit
  ) {
    return false;
  }

  return true;
}

function getCampaignDescription(campaign: MarketingCampaign) {
  if (campaign.description) return campaign.description;

  if (campaign.discountType === "percent") {
    return `Giảm ${campaign.discountValue}% cho đơn phù hợp`;
  }
  if (campaign.discountType === "amount") {
    return `Giảm ${campaign.discountValue.toLocaleString("vi-VN")}đ`;
  }
  if (campaign.discountType === "free_shipping") {
    return "Miễn phí giao hàng";
  }

  return `Nhân ${campaign.pointsMultiplier ?? campaign.discountValue} điểm`;
}

export function buildCustomerRewards(
  customer: Customer,
  allOrders: Order[],
  settings: MarketingSettings = defaultMarketingSettings,
  campaigns: MarketingCampaign[] = [],
) {
  const tiers = settings.tiers.length
    ? [...settings.tiers].sort((left, right) => left.threshold - right.threshold)
    : rewardTiers;
  const customerOrders = allOrders.filter((order) =>
    orderMatchesCustomer(order, customer),
  );
  const completedOrders = customerOrders.filter((order) =>
    completedStatuses.has(order.status),
  );
  const totalValue = completedOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0,
  );
  const pointsPerAmount = Math.max(settings.pointsPerAmount, 1);
  const earnedPoints = Math.floor(totalValue / pointsPerAmount);
  const currentPoints = Math.max(customer.loyaltyPoints, earnedPoints);
  const currentTier =
    [...tiers].reverse().find((tier) => currentPoints >= tier.threshold) ??
    tiers[0];
  const nextTier =
    tiers.find((tier) => tier.threshold > currentPoints) ?? null;
  const favorite = getFavoriteItem(completedOrders);
  const neededPoints = nextTier ? nextTier.threshold - currentPoints : 0;
  const progressStart = currentTier.threshold;
  const progressEnd = nextTier?.threshold ?? currentTier.threshold;
  const progressRange = Math.max(progressEnd - progressStart, 1);
  const progressPercent = nextTier
    ? Math.min(
        100,
        Math.round(((currentPoints - progressStart) / progressRange) * 100),
      )
    : 100;
  const activeVoucherCampaigns = campaigns
    .filter((campaign) => campaign.type === "voucher")
    .filter((campaign) => isCampaignActive(campaign));

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      tier: currentTier.name,
      tierIcon: currentTier.icon,
    },
    points: {
      current: currentPoints,
      totalEarned: currentPoints,
      neededForNextTier: neededPoints,
      progressPercent,
    },
    journey: {
      currentTierId: currentTier.id,
      nextTierId: nextTier?.id ?? null,
      currentTier,
      nextTier,
      tiers: tiers.map((tier) => ({
        ...tier,
        unlocked: currentPoints >= tier.threshold,
      })),
    },
    totals: {
      orderCount: completedOrders.length,
      lifetimeValue: totalValue,
      favoriteProduct: favorite.name,
      favoriteQuantity: favorite.quantity,
    },
    vouchers: [
      {
        id: "welcome",
        title: "Giảm 10% cho đơn tiếp theo",
        description: "Dành cho khách đã có hồ sơ tích điểm",
        unlocked: currentPoints >= 0,
      },
      {
        id: "sweet-20",
        title: "Giảm 20% khi lên Bếp Trưởng",
        description: nextTier
          ? `Cần thêm ${neededPoints} điểm`
          : "Bạn đã mở khóa hạng cao nhất",
        unlocked: currentTier.id === "chef",
      },
      ...(settings.birthdayVoucherEnabled
        ? [
            {
              id: "birthday",
              title: settings.birthdayVoucherTitle,
              description: settings.birthdayVoucherDescription,
              unlocked: Boolean(customer.personalization.birthday),
            },
          ]
        : []),
      ...activeVoucherCampaigns.map((campaign) => ({
        id: campaign.id,
        title: campaign.title || campaign.name,
        description: getCampaignDescription(campaign),
        unlocked: true,
      })),
    ],
    badges: getUnlockedBadges(completedOrders, totalValue),
  };
}
