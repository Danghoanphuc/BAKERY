import { describe, expect, it } from "vitest";
import type { Customer, Order, Product } from "@/types";
import { defaultVoucherDraft } from "@/app/(admin)/admin/vouchers/_lib/voucher-admin";
import { applyVoucherScenario, buildVoucherBusinessSnapshot, simulateVoucherScenarios } from "./voucher-business-context";

describe("voucher business context", () => {
  const now = new Date("2026-07-15T12:00:00Z");
  const order = (id: string, phone: string, totalAmount: number, hour: number): Order => ({
    id, orderNumber: id, customerName: "Khách", customerPhone: phone,
    items: [{ cartItemId: id, productId: "p1", productName: "Croissant", quantity: 2, price: totalAmount / 2, imageUrl: "" }],
    totalAmount, orderType: "pickup", status: "completed",
    estimatedGrossProfit: totalAmount * 0.4,
    createdAt: new Date(`2026-07-10T${String(hour).padStart(2, "0")}:00:00Z`), updatedAt: now,
  });

  it("derives useful metrics from real business records", () => {
    const customers = [
      { id: "c1", phone: "0901", name: "A", status: "active", loyaltyPoints: 0, tier: "new", personalization: {}, createdAt: now, updatedAt: now },
      { id: "c2", phone: "0902", name: "B", status: "active", loyaltyPoints: 0, tier: "new", personalization: {}, lastOrderAt: new Date("2026-01-01"), createdAt: now, updatedAt: now },
    ] as Customer[];
    const products = [{ id: "p1", name: "Croissant", price: 50_000, imageUrl: "", stock: 30 }] as Product[];
    const snapshot = buildVoucherBusinessSnapshot({
      orders: [order("o1", "0901", 100_000, 8), order("o2", "0901", 120_000, 9), order("o3", "0902", 80_000, 9)],
      customers, products, campaigns: [], now,
    });

    expect(snapshot.completedOrders).toBe(3);
    expect(snapshot.averageOrderValue).toBe(100_000);
    expect(snapshot.returningCustomers).toBe(1);
    expect(snapshot.inactiveCustomers).toBe(1);
    expect(snapshot.topProducts[0]?.quantity).toBe(6);
  });

  it("builds ordered scenarios with deterministic cost estimates", () => {
    const snapshot = buildVoucherBusinessSnapshot({ orders: [order("o1", "0901", 100_000, 8)], customers: [], products: [], campaigns: [], now });
    const scenarios = simulateVoucherScenarios(defaultVoucherDraft, snapshot);
    expect(scenarios.map((item) => item.id)).toEqual(["safe", "balanced", "growth"]);
    expect(scenarios[0].expectedCost).toBeLessThan(scenarios[2].expectedCost);
    expect(scenarios.every((item) => item.breakEvenOrders > 0)).toBe(true);
  });

  it("switches strategy values without changing unrelated campaign fields", () => {
    const snapshot = buildVoucherBusinessSnapshot({ orders: [order("o1", "0901", 100_000, 8)], customers: [], products: [], campaigns: [], now });
    const scenario = simulateVoucherScenarios(defaultVoucherDraft, snapshot)[2];
    const result = applyVoucherScenario(defaultVoucherDraft, scenario);

    expect(result.discountValue).toBe(scenario.discountValue);
    expect(result.maxDiscountAmount).toBe(scenario.maxDiscountAmount);
    expect(result.issuedLimit).toBe(scenario.issuedLimit);
    expect(result.code).toBe(defaultVoucherDraft.code);
    expect(result.programGoal).toBe(defaultVoucherDraft.programGoal);
  });
});
