import { beforeEach, describe, expect, it } from "vitest";
import { readPendingPosPayment } from "./usePosPayment";

const STORAGE_KEY = "bakery-pos-pending-payment";

describe("pending POS payment recovery", () => {
  beforeEach(() => sessionStorage.clear());

  it("restores a valid QR payment record", () => {
    const record = {
      order: {
        id: "order-1",
        orderNumber: "POS-001",
        totalAmount: 70_000,
        discountAmount: 0,
        loyaltyPointsEarned: 0,
      },
      snapshot: {
        status: "awaiting_payment",
        items: [],
        subtotal: 70_000,
        discountAmount: 0,
        totalAmount: 70_000,
        paymentQrCode: "data:image/png;base64,qr",
      },
      deadline: Date.now() + 60_000,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));

    expect(readPendingPosPayment()).toEqual(record);
  });

  it("discards a malformed recovery record", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ deadline: "later" }));

    expect(readPendingPosPayment()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
