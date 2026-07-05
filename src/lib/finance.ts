import type {
  ExpenseCategory,
  FinanceExpense,
  Order,
  Product,
  SalesChannel,
} from "@/types";

export type FinancePeriod = "today" | "month" | "all";

export type FinanceSummary = {
  period: FinancePeriod;
  revenue: {
    grossSales: number;
    discounts: number;
    netProductRevenue: number;
    deliveryFees: number;
    totalCollected: number;
    unpaidAmount: number;
  };
  costs: {
    estimatedCostOfGoods: number;
    expenses: number;
  };
  profit: {
    grossProfit: number;
    grossMarginPercent: number;
    operatingProfit: number;
  };
  counts: {
    orders: number;
    paidOrders: number;
    cancelledOrders: number;
  };
  byChannel: Array<{
    channel: SalesChannel;
    orders: number;
    revenue: number;
    grossProfit: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    estimatedCost: number;
    grossProfit: number;
  }>;
  expensesByCategory: Array<{
    category: ExpenseCategory;
    amount: number;
  }>;
};

const completedStatuses = new Set(["completed", "delivered", "confirmed", "preparing", "ready", "processing", "pending"]);

export function calculateProductUnitCost(product: Product) {
  const baseCost =
    (product.ingredientsCost ?? 0) +
    (product.packagingCost ?? 0) +
    (product.laborCost ?? 0) +
    (product.overheadCost ?? 0);
  const wasteMultiplier = 1 + Math.max(0, product.wastePercent ?? 0) / 100;
  return Math.round(baseCost * wasteMultiplier);
}

export function inferSalesChannel(order: Order): SalesChannel {
  if (order.salesChannel) return order.salesChannel;
  if (order.voucherUseMode === "pos_pickup_now") return "pos";
  if (order.orderType === "delivery") return "web_delivery";
  if (order.orderType === "pickup" || order.orderType === "preorder") {
    return "web_pickup";
  }
  return "admin";
}

export function getOrderProductSubtotal(order: Order) {
  return (
    order.productSubtotal ??
    order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
}

export function estimateOrderCostOfGoods(
  order: Order,
  productById: Map<string, Product>,
) {
  if (typeof order.estimatedCostOfGoods === "number") {
    return order.estimatedCostOfGoods;
  }

  return order.items.reduce((sum, item) => {
    const product = productById.get(item.productId);
    return sum + (product ? calculateProductUnitCost(product) : 0) * item.quantity;
  }, 0);
}

export function buildFinanceSummary({
  orders,
  products,
  expenses,
  period,
  now = new Date(),
}: {
  orders: Order[];
  products: Product[];
  expenses: FinanceExpense[];
  period: FinancePeriod;
  now?: Date;
}): FinanceSummary {
  const productById = new Map(products.map((product) => [product.id, product]));
  const filteredOrders = orders.filter((order) => {
    if (!isInPeriod(order.createdAt, period, now)) return false;
    return completedStatuses.has(order.status);
  });
  const activeOrders = filteredOrders.filter((order) => order.status !== "cancelled");
  const filteredExpenses = expenses.filter((expense) =>
    isInPeriod(expense.date, period, now),
  );

  const grossSales = activeOrders.reduce(
    (sum, order) => sum + getOrderProductSubtotal(order),
    0,
  );
  const discounts = activeOrders.reduce(
    (sum, order) => sum + (order.discountAmount ?? 0),
    0,
  );
  const deliveryFees = activeOrders.reduce(
    (sum, order) => sum + (order.deliveryFee ?? 0),
    0,
  );
  const estimatedCostOfGoods = activeOrders.reduce(
    (sum, order) => sum + estimateOrderCostOfGoods(order, productById),
    0,
  );
  const netProductRevenue = Math.max(0, grossSales - discounts);
  const totalCollected = activeOrders
    .filter((order) => order.paymentStatus === "paid")
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const unpaidAmount = activeOrders
    .filter((order) => order.paymentStatus !== "paid")
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const expenseTotal = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const grossProfit = netProductRevenue - estimatedCostOfGoods;
  const grossMarginPercent =
    netProductRevenue > 0 ? Math.round((grossProfit / netProductRevenue) * 1000) / 10 : 0;

  return {
    period,
    revenue: {
      grossSales,
      discounts,
      netProductRevenue,
      deliveryFees,
      totalCollected,
      unpaidAmount,
    },
    costs: {
      estimatedCostOfGoods,
      expenses: expenseTotal,
    },
    profit: {
      grossProfit,
      grossMarginPercent,
      operatingProfit: grossProfit - expenseTotal,
    },
    counts: {
      orders: activeOrders.length,
      paidOrders: activeOrders.filter((order) => order.paymentStatus === "paid").length,
      cancelledOrders: filteredOrders.filter((order) => order.status === "cancelled").length,
    },
    byChannel: buildChannelRows(activeOrders, productById),
    topProducts: buildTopProductRows(activeOrders, productById),
    expensesByCategory: buildExpenseRows(filteredExpenses),
  };
}

function buildChannelRows(orders: Order[], productById: Map<string, Product>) {
  const rows = new Map<SalesChannel, { orders: number; revenue: number; grossProfit: number }>();

  for (const order of orders) {
    const channel = inferSalesChannel(order);
    const current = rows.get(channel) ?? { orders: 0, revenue: 0, grossProfit: 0 };
    const revenue = Math.max(0, getOrderProductSubtotal(order) - (order.discountAmount ?? 0));
    current.orders += 1;
    current.revenue += revenue;
    current.grossProfit += revenue - estimateOrderCostOfGoods(order, productById);
    rows.set(channel, current);
  }

  return [...rows.entries()].map(([channel, value]) => ({ channel, ...value }));
}

function buildTopProductRows(orders: Order[], productById: Map<string, Product>) {
  const rows = new Map<
    string,
    { productId: string; name: string; quantity: number; revenue: number; estimatedCost: number }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const product = productById.get(item.productId);
      const current = rows.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        quantity: 0,
        revenue: 0,
        estimatedCost: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.price * item.quantity;
      current.estimatedCost += (product ? calculateProductUnitCost(product) : 0) * item.quantity;
      rows.set(item.productId, current);
    }
  }

  return [...rows.values()]
    .map((row) => ({
      ...row,
      grossProfit: row.revenue - row.estimatedCost,
    }))
    .sort((left, right) => right.grossProfit - left.grossProfit)
    .slice(0, 8);
}

function buildExpenseRows(expenses: FinanceExpense[]) {
  const rows = new Map<ExpenseCategory, number>();

  for (const expense of expenses) {
    rows.set(expense.category, (rows.get(expense.category) ?? 0) + expense.amount);
  }

  return [...rows.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((left, right) => right.amount - left.amount);
}

function isInPeriod(dateValue: Date | string | undefined, period: FinancePeriod, now: Date) {
  if (period === "all") return true;
  if (!dateValue) return false;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  if (period === "today") {
    return date.toDateString() === now.toDateString();
  }

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}
