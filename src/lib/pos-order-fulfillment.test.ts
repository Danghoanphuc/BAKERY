import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

const mocks = vi.hoisted(() => ({
  awardPoints: vi.fn(),
  recordVoucher: vi.fn(),
  recordInventory: vi.fn(),
  captureFinancials: vi.fn(),
  updateOrder: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({
  awardCustomerLoyaltyPointsOnce: mocks.awardPoints,
  recordVoucherRedemption: mocks.recordVoucher,
}));
vi.mock("@/lib/db", () => ({ updateOrder: mocks.updateOrder }));
vi.mock("@/features/finance", () => ({
  captureOrderFinancials: mocks.captureFinancials,
  recordProductSaleInventory: mocks.recordInventory,
}));

import { fulfillPaidPosOrder } from "./pos-order-fulfillment";

const paidOrder = {
  id: "order-1",
  orderNumber: "BK-1",
  customerId: "customer-1",
  customerName: "Khách",
  customerPhone: "0900000000",
  items: [{
    cartItemId: "cake",
    productId: "cake",
    productName: "Bánh",
    price: 100_000,
    quantity: 1,
  }],
  productSubtotal: 100_000,
  discountAmount: 10_000,
  totalAmount: 90_000,
  orderType: "pickup",
  salesChannel: "pos",
  status: "completed",
  paymentStatus: "paid",
  paymentMethod: "cash",
  loyaltyPointsEarned: 9,
  voucherId: "voucher-1",
  voucherCode: "SAVE10",
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Order;

describe("paid POS order fulfillment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordInventory.mockResolvedValue({ inventoryValue: 40_000 });
  });

  it("rejects orders that are not paid", async () => {
    await expect(
      fulfillPaidPosOrder({ ...paidOrder, paymentStatus: "pending" }, "pos"),
    ).rejects.toThrow("POS_ORDER_NOT_PAID");
    expect(mocks.recordInventory).not.toHaveBeenCalled();
  });

  it("centralizes inventory, loyalty, voucher and finance side effects", async () => {
    await fulfillPaidPosOrder(paidOrder, "pos");

    expect(mocks.recordInventory).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-1", actor: "pos" }),
    );
    expect(mocks.awardPoints).toHaveBeenCalledWith({
      customerId: "customer-1",
      orderId: "order-1",
      points: 9,
    });
    expect(mocks.recordVoucher).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: "order-1", voucherId: "voucher-1" }),
    );
    expect(mocks.captureFinancials).toHaveBeenCalledOnce();
    expect(mocks.updateOrder).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({ actualCostOfGoods: 40_000 }),
    );
  });
});
