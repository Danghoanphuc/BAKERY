import type {
  Customer,
  MarketingCampaign,
  MarketingSettings,
  Order,
} from "@/types";
import { defaultMarketingSettings } from "@/lib/wholesale-firebase/marketing";

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

function hasEveningOrder(orders: Order[]) {
  return orders.some((order) => new Date(order.createdAt).getHours() >= 18);
}

function getUnlockedBadges(orders: Order[], totalValue: number) {
  const favorite = getFavoriteItem(orders);
  const cakeOrders = orders.filter((order) =>
    order.items.some((item) => /bánh|cake/i.test(item.productName)),
  );

  return [
    {
      id: "first-order",
      title: "Lần đầu ghé tiệm",
      description: "Có giao dịch đầu tiên được ghi nhận",
      icon: "🍰",
      unlocked: orders.length >= 1,
    },
    {
      id: "party",
      title: "Người đặt tiệc",
      description: "Hay mua bánh cho dịp đặc biệt",
      icon: "🎂",
      unlocked: cakeOrders.length >= 2 || totalValue >= 1000000,
    },
    {
      id: "evening",
      title: "Khách buổi tối",
      description: "Hay mua bánh vào cuối ngày",
      icon: "🌙",
      unlocked: hasEveningOrder(orders),
    },
    {
      id: "favorite",
      title: "Món ruột",
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
  const nextTier = tiers.find((tier) => tier.threshold > currentPoints) ?? null;
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
    .filter((campaign) => isCampaignActive(campaign))
    .filter((campaign) => campaign.publishing?.isPublic);

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      tier: currentTier.name,
      tierIcon: currentTier.icon,
      tierImageUrl: currentTier.imageUrl,
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
        code: "WELCOME10",
        title: "Giảm 10% cho đơn tiếp theo",
        description: "Dành cho khách đã có hồ sơ tích điểm",
        unlocked: currentPoints >= 0,
        discountType: "percent" as const,
        discountValue: 10,
        channels: ["pos_pickup_now", "web_pickup_later", "web_delivery"],
        maxUsesPerPhone: 1,
      },
      {
        id: "sweet-20",
        code: "SWEET20",
        title: "Giảm 20% khi lên Bếp trưởng",
        description: nextTier
          ? `Cần thêm ${neededPoints} điểm`
          : "Bạn đã mở khóa hạng cao nhất",
        unlocked: currentTier.id === "chef",
        discountType: "percent" as const,
        discountValue: 20,
        channels: ["pos_pickup_now", "web_pickup_later", "web_delivery"],
        maxUsesPerPhone: 1,
      },
      ...(settings.birthdayVoucherEnabled
        ? [
            {
              id: "birthday",
              code: "BIRTHDAY",
              title: settings.birthdayVoucherTitle,
              description: settings.birthdayVoucherDescription,
              unlocked: Boolean(customer.personalization.birthday),
              discountType: "percent" as const,
              discountValue: 15,
              channels: [
                "pos_pickup_now",
                "web_pickup_later",
                "web_delivery",
              ],
              maxUsesPerPhone: 1,
            },
          ]
        : []),
      ...activeVoucherCampaigns
        .filter(
          (campaign) =>
            campaign.discountType === "percent" ||
            campaign.discountType === "amount",
        )
        .map((campaign) => ({
          id: campaign.id,
          code: campaign.code ?? campaign.codePrefix ?? campaign.id,
          title: campaign.title || campaign.name,
          description: getCampaignDescription(campaign),
          unlocked: true,
          discountType:
            campaign.discountType === "amount"
              ? ("fixed" as const)
              : ("percent" as const),
          discountValue: campaign.discountValue,
          minOrderValue: campaign.minOrderValue ?? campaign.rules?.minOrderValue,
          maxDiscountAmount:
            campaign.maxDiscountAmount ?? campaign.rules?.maxDiscountAmount,
          channels: campaign.channels ?? [
            "pos_pickup_now",
            "web_pickup_later",
            "web_delivery",
          ],
          maxUsesPerPhone: campaign.rules?.maxUsesPerCustomer ?? 1,
        })),
    ],
    badges: getUnlockedBadges(completedOrders, totalValue),
  };
}
