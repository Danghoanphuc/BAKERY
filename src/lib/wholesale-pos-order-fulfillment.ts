import {
  awardCustomerLoyaltyPointsOnce,
  recordVoucherRedemption,
} from "@/lib/wholesale-firebase";
import { updateOrder } from "@/lib/wholesale-db";
import {
  captureOrderFinancials,
  recordProductSaleInventory,
} from "@/features/wholesale-finance";
import type { Order } from "@/types";

export async function fulfillPaidPosOrder(order: Order, actor: string) {
  if (order.salesChannel !== "pos" || order.paymentStatus !== "paid") {
    throw new Error("POS_ORDER_NOT_PAID");
  }

  const inventorySale = await recordProductSaleInventory({
    orderId: order.id,
    items: order.items.map((item) => ({
      ...item,
      unitStandardCost: order.itemFinancialSnapshots?.find(
        (snapshot) => snapshot.productId === item.productId,
      )?.unitCost,
    })),
    actor,
  });

  if (order.customerId && (order.loyaltyPointsEarned ?? 0) > 0) {
    await awardCustomerLoyaltyPointsOnce({
      customerId: order.customerId,
      orderId: order.id,
      points: order.loyaltyPointsEarned ?? 0,
    });
  }

  if (order.voucherId && (order.discountAmount ?? 0) > 0) {
    await recordVoucherRedemption({
      voucherId: order.voucherId,
      voucherCode: order.voucherCode,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      phone: order.customerPhone,
      channel: "pos_pickup_now",
      subtotal: order.productSubtotal ?? 0,
      discountAmount: order.discountAmount ?? 0,
      totalAfterDiscount: order.totalAmount,
      source: "pos",
    });
  }

  const fulfilledAt = new Date();
  await captureOrderFinancials(
    {
      ...order,
      actualCostOfGoods: inventorySale.inventoryValue,
      posFulfilledAt: fulfilledAt,
    },
    actor,
  );
  await updateOrder(order.id, {
    actualCostOfGoods: inventorySale.inventoryValue,
    inventoryReservationStatus: "consumed",
    ...(order.paymentMethod === "bank_transfer"
      ? { payosStockDeducted: true }
      : {}),
    posFulfilledAt: fulfilledAt,
  });

  return {
    actualCostOfGoods: inventorySale.inventoryValue,
    fulfilledAt,
  };
}
