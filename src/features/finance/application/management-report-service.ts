import { getAllProducts, getOrders } from "@/lib/db";
import { getFinanceExpenses } from "@/lib/firebase/finance";
import { estimateOrderCostOfGoods, getOrderProductSubtotal } from "@/lib/finance";
import { isRevenueRecognized } from "../domain/revenue-policy";
import { calculateManagementAccountingSummary } from "../domain/management-accounting";
import { getManagementConfiguration } from "./management-service";

function timestamp(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  return new Date(String(value));
}

function belongsToPeriod(value: unknown, period: string) {
  const date = timestamp(value);
  if (Number.isNaN(date.getTime())) return false;
  const [year, month] = period.split("-").map(Number);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

export async function getManagementAccountingReport(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("INVALID_PERIOD");
  const [orders, products, expenses, configuration] = await Promise.all([
    getOrders(), getAllProducts(), getFinanceExpenses(), getManagementConfiguration(period),
  ]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const periodOrders = orders.filter((order) => belongsToPeriod(order.createdAt, period) && isRevenueRecognized(order));
  const periodExpenses = expenses.filter((expense) => belongsToPeriod(expense.date, period));
  const netRevenue = periodOrders.reduce((sum, order) =>
    sum + Math.max(0, getOrderProductSubtotal(order) - (order.discountAmount ?? 0)) + (order.deliveryFee ?? 0), 0);
  const actualCostOfGoods = periodOrders.reduce((sum, order) =>
    sum + (order.actualCostOfGoods ?? estimateOrderCostOfGoods(order, productById)), 0);
  const revenue: Record<string, number> = {};
  const orderCount: Record<string, number> = {};
  for (const center of configuration.costCenters) {
    if (!center.channel) continue;
    const centerOrders = periodOrders.filter((order) => order.salesChannel === center.channel);
    revenue[center.id] = centerOrders.reduce((sum, order) =>
      sum + Math.max(0, getOrderProductSubtotal(order) - (order.discountAmount ?? 0)), 0);
    orderCount[center.id] = centerOrders.length;
  }
  const directLaborCost: Record<string, number> = {};
  for (const expense of periodExpenses) {
    if (expense.category !== "payroll" || !expense.management?.costCenterId) continue;
    directLaborCost[expense.management.costCenterId] =
      (directLaborCost[expense.management.costCenterId] ?? 0) + expense.amount;
  }
  return calculateManagementAccountingSummary({
    period, netRevenue, actualCostOfGoods, expenses: periodExpenses,
    budget: configuration.budget, policies: configuration.policies,
    driverValuesByDriver: {
      revenue, order_count: orderCount, direct_labor_cost: directLaborCost,
    },
  });
}

