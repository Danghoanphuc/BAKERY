import type { Customer, MarketingCampaign, Order, Product } from "@/types";
import type { VoucherDraft } from "@/app/(admin)/admin/vouchers/_lib/voucher-admin";
import { getAllCustomers, getAllOrders, getAllProducts, getMarketingCampaigns } from "@/lib/firebase";
import { getMaxPromotionBudget } from "@/app/(admin)/admin/vouchers/_lib/voucher-admin";

export type VoucherBusinessSnapshot = {
  generatedAt: string;
  periodDays: number;
  completedOrders: number;
  revenue: number;
  averageOrderValue: number;
  estimatedGrossMarginPercent: number;
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  inactiveCustomers: number;
  repeatCustomerRate: number;
  slowHours: Array<{ hour: number; orders: number }>;
  topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
  inventoryRisks: Array<{ productId: string; name: string; stock: number; sold: number }>;
  pastVoucherPerformance: Array<{ name: string; usageRate: number; roi: number }>;
};

export type VoucherScenario = {
  id: "safe" | "balanced" | "growth";
  label: string;
  discountValue: number;
  maxDiscountAmount: number;
  issuedLimit: number;
  expectedRedemptions: number;
  maxCost: number;
  expectedCost: number;
  breakEvenOrders: number;
  projectedRevenue: number;
  risk: "low" | "medium" | "high";
  rationale: string;
};

export function applyVoucherScenario(draft: VoucherDraft, scenario: VoucherScenario): VoucherDraft {
  return {
    ...draft,
    discountValue: scenario.discountValue,
    maxDiscountAmount: scenario.maxDiscountAmount,
    issuedLimit: scenario.issuedLimit,
  };
}

export async function loadVoucherBusinessSnapshot(periodDays = 90): Promise<VoucherBusinessSnapshot> {
  const [orders, customers, products, campaigns] = await Promise.all([
    getAllOrders(1000), getAllCustomers(), getAllProducts(), getMarketingCampaigns(),
  ]);
  return buildVoucherBusinessSnapshot({ orders, customers, products, campaigns, periodDays });
}

export function buildVoucherBusinessSnapshot(input: {
  orders: Order[];
  customers: Customer[];
  products: Product[];
  campaigns: MarketingCampaign[];
  periodDays?: number;
  now?: Date;
}): VoucherBusinessSnapshot {
  const now = input.now ?? new Date();
  const periodDays = input.periodDays ?? 90;
  const start = new Date(now.getTime() - periodDays * 86_400_000);
  const orders = input.orders.filter((order) =>
    order.createdAt >= start && ["completed", "delivered"].includes(order.status));
  const revenue = sum(orders.map((order) => order.totalAmount));
  const grossProfit = sum(orders.map((order) => order.estimatedGrossProfit ?? 0));
  const orderCountByPhone = new Map<string, number>();
  const hourly = Array.from({ length: 24 }, () => 0);
  const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

  for (const order of orders) {
    orderCountByPhone.set(order.customerPhone, (orderCountByPhone.get(order.customerPhone) ?? 0) + 1);
    hourly[order.createdAt.getHours()] += 1;
    for (const item of order.items) {
      const current = productSales.get(item.productId) ?? { name: item.productName, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += item.price * item.quantity;
      productSales.set(item.productId, current);
    }
  }

  const returningCustomers = [...orderCountByPhone.values()].filter((count) => count >= 2).length;
  const activeCustomerCount = orderCountByPhone.size;
  const inactiveBefore = new Date(now.getTime() - 60 * 86_400_000);
  const inactiveCustomers = input.customers.filter((customer) =>
    customer.lastOrderAt && customer.lastOrderAt < inactiveBefore).length;
  const topProducts = [...productSales.entries()]
    .map(([productId, value]) => ({ productId, ...value }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
  const inventoryRisks = input.products
    .filter((product) => (product.stock ?? 0) > 0)
    .map((product) => ({ productId: product.id, name: product.name, stock: product.stock ?? 0, sold: productSales.get(product.id)?.quantity ?? 0 }))
    .sort((a, b) => (b.stock / Math.max(1, b.sold)) - (a.stock / Math.max(1, a.sold)))
    .slice(0, 5);
  const pastVoucherPerformance = input.campaigns
    .filter((campaign) => campaign.type === "voucher" && (campaign.metrics?.issuedCount ?? 0) > 0)
    .map((campaign) => {
      const issued = campaign.metrics?.issuedCount ?? 0;
      const redeemed = campaign.metrics?.redeemedCount ?? 0;
      const spent = campaign.metrics?.discountSpent ?? 0;
      const generated = campaign.metrics?.revenueGenerated ?? 0;
      return { name: campaign.name, usageRate: round((redeemed / issued) * 100), roi: spent > 0 ? round(generated / spent) : 0 };
    })
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  return {
    generatedAt: now.toISOString(), periodDays, completedOrders: orders.length,
    revenue, averageOrderValue: orders.length ? Math.round(revenue / orders.length) : 0,
    estimatedGrossMarginPercent: revenue > 0 && grossProfit > 0 ? round((grossProfit / revenue) * 100) : 35,
    totalCustomers: input.customers.length,
    newCustomers: [...orderCountByPhone.values()].filter((count) => count === 1).length,
    returningCustomers, inactiveCustomers,
    repeatCustomerRate: activeCustomerCount ? round((returningCustomers / activeCustomerCount) * 100) : 0,
    slowHours: hourly.map((count, hour) => ({ hour, orders: count })).filter(({ hour }) => hour >= 7 && hour <= 21).sort((a, b) => a.orders - b.orders).slice(0, 3),
    topProducts, inventoryRisks, pastVoucherPerformance,
  };
}

export function simulateVoucherScenarios(draft: VoucherDraft, snapshot: VoucherBusinessSnapshot): VoucherScenario[] {
  const profiles = [
    { id: "safe" as const, label: "An toàn", multiplier: 0.7, redemption: 0.18, risk: "low" as const },
    { id: "balanced" as const, label: "Cân bằng", multiplier: 1, redemption: 0.3, risk: "medium" as const },
    { id: "growth" as const, label: "Tăng trưởng", multiplier: 1.35, redemption: 0.45, risk: "high" as const },
  ];
  const aov = Math.max(snapshot.averageOrderValue, draft.minOrderValue, 50_000);
  const margin = Math.max(0.05, snapshot.estimatedGrossMarginPercent / 100);
  const baseCap = Math.max(1_000, draft.maxDiscountAmount || draft.discountValue);

  return profiles.map((profile) => {
    const discountValue = draft.discountType === "percent"
      ? Math.min(70, Math.max(5, Math.round(draft.discountValue * profile.multiplier)))
      : Math.round(draft.discountValue * profile.multiplier / 1000) * 1000;
    const maxDiscountAmount = Math.round(baseCap * profile.multiplier / 1000) * 1000;
    const budget = getMaxPromotionBudget({ ...draft, discountValue, maxDiscountAmount });
    const issuedLimit = Math.max(1, draft.issuedLimit);
    const expectedRedemptions = Math.max(1, Math.round(issuedLimit * profile.redemption));
    const expectedCost = Math.min(budget, expectedRedemptions * maxDiscountAmount);
    const projectedRevenue = Math.round(expectedRedemptions * aov);
    return {
      id: profile.id, label: profile.label, discountValue, maxDiscountAmount, issuedLimit,
      expectedRedemptions, maxCost: budget, expectedCost,
      breakEvenOrders: Math.ceil(expectedCost / Math.max(1, aov * margin)),
      projectedRevenue, risk: profile.risk,
      rationale: profile.id === "safe" ? "Bảo toàn biên lợi nhuận, phù hợp thử nghiệm." : profile.id === "growth" ? "Ưu đãi mạnh để tăng tốc tiếp cận, cần theo dõi ngân sách sát." : "Cân bằng độ hấp dẫn và chi phí dự kiến.",
    };
  });
}

function sum(values: number[]) { return values.reduce((total, value) => total + value, 0); }
function round(value: number) { return Math.round(value * 10) / 10; }
