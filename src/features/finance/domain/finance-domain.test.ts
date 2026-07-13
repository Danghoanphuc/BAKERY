import { describe, expect, it } from "vitest";
import type { Order } from "@/types";
import { vnd } from "./money";
import { quantity } from "./quantity";
import { buildOrderEconomicEntries } from "./order-financial-events";
import { isOrderCancelled, isRevenueRecognized } from "./revenue-policy";
import { buildFinanceSummary } from "@/lib/finance";
import { calculateRecipeStandardUnitCost } from "./standard-costing";
import { allocateDiscountByLargestRemainder, buildItemFinancialSnapshots } from "./item-financial-snapshot";
import type { FinanceIngredient, RecipeVersion } from "@/types";
import { calculateCostPerBaseUnitMicros, convertToBaseQuantity } from "./unit-conversion";
import { calculateActualBatchCost, calculateWeightedBalance, consumeWeightedInventory } from "./inventory-costing";
import {
  allocateIndirectCost, calculateManagementAccountingSummary,
  simulateManagementScenario,
} from "./management-accounting";
import type { AllocationPolicyVersion, FinanceExpense, MonthlyBudget } from "@/types";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1", orderNumber: "BK1", customerName: "Khách",
    customerPhone: "0900000000", items: [{ cartItemId: "cake:default", productId: "cake", productName: "Bánh", imageUrl: "/cake.jpg", price: 100_000, quantity: 2 }],
    productSubtotal: 200_000, discountAmount: 20_000, deliveryFee: 15_000,
    totalAmount: 195_000, estimatedCostOfGoods: 80_000,
    orderType: "delivery", status: "confirmed", paymentStatus: "unpaid",
    paymentMethod: "cod", salesChannel: "web_delivery",
    createdAt: new Date("2026-07-12T10:00:00+07:00"),
    updatedAt: new Date("2026-07-12T10:00:00+07:00"), ...overrides,
  };
}

describe("finance domain", () => {
  it("keeps VND and quantities as safe non-negative integers", () => {
    expect(vnd(125_000).amount).toBe(125_000);
    expect(quantity(500, "gram")).toEqual({ value: 500, unit: "gram" });
    expect(() => vnd(1.5)).toThrow();
    expect(() => quantity(-1, "each")).toThrow();
  });

  it("recognizes revenue only after the order is operationally accepted", () => {
    expect(isRevenueRecognized(order({ status: "pending" }))).toBe(false);
    expect(isRevenueRecognized(order({ status: "confirmed" }))).toBe(true);
    expect(isRevenueRecognized(order({ status: "delivered" }))).toBe(true);
    expect(isOrderCancelled(order({ status: "cancelled" }))).toBe(true);
  });

  it("creates traceable and idempotent economic entries", () => {
    const entries = buildOrderEconomicEntries(order(), "test");
    expect(entries.map((entry) => [entry.type, entry.amount])).toEqual([
      ["sale", 200_000], ["discount", 20_000],
      ["delivery_revenue", 15_000], ["cost_of_goods_sold", 80_000],
    ]);
    expect(new Set(entries.map((entry) => entry.idempotencyKey)).size).toBe(4);
    expect(entries.every((entry) => entry.status === "posted")).toBe(true);
  });

  it("keeps revenue, collections and cancellations as separate measures", () => {
    const summary = buildFinanceSummary({
      orders: [
        order({ id: "recognized", paymentStatus: "unpaid" }),
        order({ id: "pending", status: "pending", paymentStatus: "paid" }),
        order({ id: "cancelled", status: "cancelled" }),
      ],
      products: [],
      expenses: [],
      period: "today",
      now: new Date("2026-07-12T12:00:00+07:00"),
    });

    expect(summary.counts.orders).toBe(1);
    expect(summary.counts.cancelledOrders).toBe(1);
    expect(summary.revenue.netProductRevenue).toBe(180_000);
    expect(summary.revenue.unpaidAmount).toBe(195_000);
    expect(summary.profit.operatingProfit).toBe(115_000);
    expect(summary.topProducts[0]?.revenue).toBe(180_000);
  });

  it("calculates reproducible standard cost from a versioned bakery recipe", () => {
    const flour: FinanceIngredient = {
      id: "flour", code: "NL-BOT", name: "Bột mì", baseUnit: "gram",
      costPerBaseUnitMicros: 35_000_000, isActive: true,
    };
    const recipe: RecipeVersion = {
      id: "recipe-1", productId: "cake", version: 1, status: "active",
      effectiveFrom: new Date("2026-07-01"), yieldQuantity: 10,
      ingredients: [{ ingredientId: "flour", quantity: 1_000 }],
      packagingCostPerBatch: 5_000, directLaborCostPerBatch: 10_000,
      overheadCostPerBatch: 5_000, wasteBasisPoints: 1_000,
    };
    const cost = calculateRecipeStandardUnitCost(recipe, new Map([[flour.id, flour]]));
    expect(cost).toMatchObject({
      ingredientCost: 3_500, packagingCost: 500, directLaborCost: 1_000,
      overheadCost: 500, wasteCost: 550, totalCost: 6_050,
      source: "recipe", recipeVersionId: "recipe-1",
    });
  });

  it("normalizes bakery purchasing units without floating point money", () => {
    expect(convertToBaseQuantity(2.5, "kilogram")).toEqual({ value: 2_500, unit: "gram" });
    expect(calculateCostPerBaseUnitMicros({
      purchaseAmount: 87_500, purchaseQuantity: 2.5, purchaseUnit: "kilogram",
    })).toEqual({ costPerBaseUnitMicros: 35_000_000, baseUnit: "gram" });
  });

  it("allocates every VND of discount and snapshots item profitability", () => {
    expect(allocateDiscountByLargestRemainder([100, 100, 100], 100))
      .toEqual([34, 33, 33]);
    const snapshots = buildItemFinancialSnapshots({
      items: order().items, discountAmount: 20_000,
      products: [{ id: "cake", name: "Bánh", price: 100_000, imageUrl: "", ingredientsCost: 30_000 }],
      recipes: [], ingredients: [],
    });
    expect(snapshots[0]).toMatchObject({
      grossRevenue: 200_000, allocatedDiscount: 20_000, netRevenue: 180_000,
      unitCost: 30_000, totalCost: 60_000, grossProfit: 120_000,
      costingSource: "legacy",
    });
  });

  it("preserves inventory quantity and value under weighted costing", () => {
    expect(calculateWeightedBalance({
      currentQuantity: 1_000, currentValue: 35_000,
      receivedQuantity: 2_000, receivedValue: 80_000,
    })).toEqual({ quantity: 3_000, inventoryValue: 115_000 });
    const consumed = consumeWeightedInventory({
      itemType: "ingredient", itemId: "flour", locationId: "main",
      quantity: 3_000, inventoryValue: 115_000,
    }, 1_000);
    expect(consumed).toEqual({
      consumedValue: 38_333,
      nextBalance: {
        itemType: "ingredient", itemId: "flour", locationId: "main",
        quantity: 2_000, inventoryValue: 76_667,
      },
    });
    expect(() => consumeWeightedInventory({
      itemType: "ingredient", itemId: "flour", locationId: "main",
      quantity: 10, inventoryValue: 100,
    }, 11)).toThrow("INSUFFICIENT_INVENTORY:flour");
  });

  it("absorbs batch defects into the actual cost of good output", () => {
    expect(calculateActualBatchCost({
      usages: [], ingredientCost: 60_000, packagingCost: 10_000,
      directLaborCost: 20_000, overheadCost: 10_000, actualGoodQuantity: 8,
    })).toEqual({ totalActualCost: 100_000, actualUnitCost: 12_500 });
  });

  it("builds a management accounting waterfall and budget variance", () => {
    const expenses: FinanceExpense[] = [
      {
        id: "delivery", date: new Date(), category: "delivery", amount: 100_000,
        management: { behavior: "variable", traceability: "direct", function: "selling", costCenterId: "sales" },
      },
      {
        id: "rent", date: new Date(), category: "rent", amount: 200_000,
        management: { behavior: "fixed", traceability: "indirect", function: "administration", costCenterId: "admin" },
      },
    ];
    const policy: AllocationPolicyVersion = {
      id: "policy", policyCode: "ADMIN", name: "Phân bổ quản lý", version: 1,
      status: "active", sourceCostCenterId: "admin", driver: "manual_weight",
      targets: [{ costCenterId: "sales", weightBasisPoints: 10_000 }],
      effectiveFrom: new Date(),
    };
    const budget: MonthlyBudget = {
      id: "budget", period: "2026-07", version: 1, status: "approved", createdBy: "admin",
      lines: [
        { id: "revenue", metric: "net_revenue", plannedAmount: 900_000 },
        { id: "delivery", metric: "expense", category: "delivery", plannedAmount: 80_000 },
      ],
    };
    const summary = calculateManagementAccountingSummary({
      period: "2026-07", netRevenue: 1_000_000, actualCostOfGoods: 400_000,
      expenses, budget, policies: [policy],
    });
    expect(summary).toMatchObject({
      variableCosts: 500_000, contributionProfit: 500_000,
      controllableProfit: 500_000, allocatedIndirectCosts: 200_000,
      operatingProfit: 300_000, breakEvenRevenue: 400_000,
    });
    expect(summary.budgetVariances.map((item) => item.favorable)).toEqual([true, false]);
    expect(summary.costByCenter.find((item) => item.costCenterId === "sales"))
      .toMatchObject({ directCost: 100_000, allocatedCost: 200_000, totalCost: 300_000 });
    expect(allocateIndirectCost({ amount: 101, policy: {
      ...policy,
      targets: [
        { costCenterId: "a", weightBasisPoints: 5_000 },
        { costCenterId: "b", weightBasisPoints: 5_000 },
      ],
    }}).map((item) => item.amount)).toEqual([51, 50]);
  });

  it("simulates price, volume and cost changes without mutating actuals", () => {
    expect(simulateManagementScenario({
      netRevenue: 1_000_000, variableCosts: 600_000, fixedCosts: 200_000,
      priceChangeBasisPoints: 1_000, volumeChangeBasisPoints: 1_000,
      variableCostChangeBasisPoints: 0, fixedCostChangeBasisPoints: 0,
    })).toMatchObject({
      projectedRevenue: 1_210_000, projectedVariableCosts: 660_000,
      contributionProfit: 550_000, operatingProfit: 350_000,
    });
  });
});
