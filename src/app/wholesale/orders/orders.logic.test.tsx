import { act, renderHook, waitFor } from "@testing-library/react";
import type { Order } from "@/types";
import { getPrimaryOrderTransition } from "@/lib/orders/order-workflow";
import { parseOrderUpdate } from "@/lib/orders/order-update";
import { getQuickActions, matchesDateFilter } from "./_lib/order-utils";
import {
  calculateOrderStats,
  useOrderSelection,
} from "./_hooks/useOrders";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    orderNumber: "BK001",
    customerName: "Khách",
    customerPhone: "0900000000",
    items: [],
    totalAmount: 100_000,
    orderType: "delivery",
    status: "pending",
    paymentStatus: "unpaid",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("admin order workflow", () => {
  it("uses the fulfillment type for the final quick action", () => {
    const delivery = order({ status: "ready", orderType: "delivery" });
    const pickup = order({ status: "ready", orderType: "pickup" });

    expect(getPrimaryOrderTransition(delivery)).toBe("delivered");
    expect(getPrimaryOrderTransition(pickup)).toBe("completed");
    expect(getQuickActions(delivery)).toEqual([
      { status: "delivered", label: "Đã giao" },
    ]);
  });

  it("excludes terminal orders from the upcoming filter", () => {
    const pickupTime = new Date(Date.now() + 60_000).toISOString();
    expect(matchesDateFilter(order({ pickupTime }), "upcoming")).toBe(true);
    expect(
      matchesDateFilter(order({ pickupTime, status: "completed" }), "upcoming"),
    ).toBe(false);
    expect(
      matchesDateFilter(order({ pickupTime, status: "cancelled" }), "upcoming"),
    ).toBe(false);
  });

  it("does not count pending orders as recognized revenue or active work", () => {
    const pending = order({ id: "pending", totalAmount: 32_000 });
    const confirmed = order({
      id: "confirmed",
      status: "confirmed",
      totalAmount: 50_000,
    });

    expect(calculateOrderStats([pending, confirmed])).toMatchObject({
      pending: 1,
      active: 1,
      revenueToday: 50_000,
    });
  });

  it("drops hidden selections when the visible result set changes", async () => {
    const first = order({ id: "first" });
    const second = order({ id: "second", orderNumber: "BK002" });
    const { result, rerender } = renderHook(
      ({ orders }) => useOrderSelection(orders),
      { initialProps: { orders: [first, second] } },
    );

    act(() => result.current.toggleSelectOrder("first"));
    expect(result.current.selectedIds).toEqual(["first"]);

    rerender({ orders: [second] });
    await waitFor(() => expect(result.current.selectedIds).toEqual([]));
  });
});

describe("admin order updates", () => {
  it("accepts operational fields and rejects mass assignment", () => {
    expect(parseOrderUpdate({ assignedTo: "Bếp A", status: "confirmed" })).toEqual({
      assignedTo: "Bếp A",
      status: "confirmed",
    });
    expect(() => parseOrderUpdate({ totalAmount: 1 })).toThrow(
      "UNSUPPORTED_ORDER_UPDATE_FIELD",
    );
  });
});
