import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/types";

const mocks = vi.hoisted(() => ({
  captureRefund: vi.fn(),
  returnInventory: vi.fn(),
  reversePoints: vi.fn(),
  reverseVoucher: vi.fn(),
  updateOrder: vi.fn(),
}));
vi.mock("@/features/finance", () => ({ captureRefund: mocks.captureRefund }));
vi.mock("@/lib/db", () => ({ updateOrder: mocks.updateOrder }));
vi.mock("@/lib/firebase", () => ({
  reverseCustomerLoyaltyPointsOnce: mocks.reversePoints,
  reverseVoucherRedemption: mocks.reverseVoucher,
}));
vi.mock("@/lib/firebase/pos-inventory", () => ({
  returnConsumedPosInventory: mocks.returnInventory,
}));

import { refundPaidPosOrder } from "./pos-order-refund";

const order = {
  id: "pos-1",
  orderNumber: "BK1",
  customerId: "customer-1",
  customerName: "Khách",
  customerPhone: "0900000000",
  items: [],
  totalAmount: 90_000,
  discountAmount: 10_000,
  loyaltyPointsEarned: 9,
  voucherId: "voucher-1",
  orderType: "pickup",
  salesChannel: "pos",
  status: "completed",
  paymentStatus: "paid",
  paymentMethod: "cash",
  inventoryReservationStatus: "consumed",
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Order;

describe("POS full refund", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reverses every paid-order side effect", async () => {
    const refunded = await refundPaidPosOrder(order, {
      reason: "Khách trả hàng",
      actor: "pos",
    });

    expect(mocks.captureRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "pos-1",
        amount: 90_000,
        idempotencyKey: "order:pos-1:full-refund",
      }),
    );
    expect(mocks.returnInventory).toHaveBeenCalledWith("pos-1");
    expect(mocks.reversePoints).toHaveBeenCalledOnce();
    expect(mocks.reverseVoucher).toHaveBeenCalledOnce();
    expect(refunded.paymentStatus).toBe("refunded");
    expect(mocks.updateOrder).toHaveBeenCalledOnce();
  });

  it("refuses unpaid orders", async () => {
    await expect(
      refundPaidPosOrder({ ...order, paymentStatus: "pending" }, {
        reason: "Không thanh toán",
        actor: "pos",
      }),
    ).rejects.toThrow("ORDER_NOT_PAID");
  });
});
