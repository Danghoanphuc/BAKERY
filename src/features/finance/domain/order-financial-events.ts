import type { Order } from "@/types";
import { DEFAULT_BRANCH_ID } from "./dimensions";
import type { AppendEconomicEntryInput } from "./ledger";
import { isRevenueRecognized } from "./revenue-policy";

export function buildOrderEconomicEntries(
  order: Order,
  actor: string,
): AppendEconomicEntryInput[] {
  const status = isRevenueRecognized(order) ? "posted" : "pending";
  const occurredAt = new Date(order.createdAt);
  const dimensions = {
    branchId: DEFAULT_BRANCH_ID,
    channel: order.salesChannel,
    customerId: order.customerId,
  };
  const entries: AppendEconomicEntryInput[] = [];
  const productSubtotal = order.productSubtotal ?? order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (productSubtotal > 0) {
    entries.push({
      type: "sale", status, amount: productSubtotal, occurredAt,
      sourceType: "order", sourceId: order.id,
      idempotencyKey: `order:${order.id}:sale`, dimensions, createdBy: actor,
    });
  }
  if ((order.discountAmount ?? 0) > 0) {
    entries.push({
      type: "discount", status, amount: order.discountAmount ?? 0, occurredAt,
      sourceType: "order", sourceId: order.id,
      idempotencyKey: `order:${order.id}:discount`, dimensions, createdBy: actor,
    });
  }
  if ((order.deliveryFee ?? 0) > 0) {
    entries.push({
      type: "delivery_revenue", status, amount: order.deliveryFee ?? 0, occurredAt,
      sourceType: "order", sourceId: order.id,
      idempotencyKey: `order:${order.id}:delivery`, dimensions, createdBy: actor,
    });
  }
  if ((order.estimatedCostOfGoods ?? 0) > 0) {
    entries.push({
      type: "cost_of_goods_sold", status, amount: order.estimatedCostOfGoods ?? 0,
      occurredAt, sourceType: "order", sourceId: order.id,
      idempotencyKey: `order:${order.id}:cogs`, dimensions, createdBy: actor,
    });
  }
  return entries;
}

