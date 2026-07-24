import { NextResponse } from "next/server";
import { getOrders } from "@/lib/wholesale-db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getInventoryBalances, getInventoryMovements, getProductionBatches } from "@/features/wholesale-finance";
import type { CartItem, InventoryMovement, Order, ProductionBatch } from "@/types";

const activeDeliveryStatuses = new Set(["confirmed", "preparing", "ready", "processing"]);
const completedStatuses = new Set(["completed", "delivered"]);

function toDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") return value.toDate();
  if (value && typeof value === "object" && "seconds" in value && typeof value.seconds === "number") return new Date(value.seconds * 1000);
  return new Date(0);
}

function itemVariantLabel(item: CartItem) {
  const values = [item.selectedSizeLabel, item.selectedFlavorLabel].filter(Boolean);
  return values.length > 0 ? values.join(" × ") : "Sản phẩm gốc";
}

function productLines(order: Order, productId: string) {
  return order.items.filter((item) => item.productId === productId);
}

function quantity(lines: CartItem[]) {
  return lines.reduce((total, item) => total + item.quantity, 0);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { id: productId } = await context.params;
  const parsedDays = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const days = [7, 30, 90].includes(parsedDays) ? parsedDays : 30;
  const from = new Date();
  from.setDate(from.getDate() - days);

  const [orders, balances, movements, batches] = await Promise.all([
    getOrders(),
    getInventoryBalances({ itemType: "product", itemId: productId }),
    getInventoryMovements({ itemType: "product", itemId: productId }),
    getProductionBatches(),
  ]);

  const relevantOrders = orders
    .map((order) => ({ order, lines: productLines(order, productId), occurredAt: toDate(order.createdAt) }))
    .filter(({ lines }) => lines.length > 0);
  const periodOrders = relevantOrders.filter(({ occurredAt }) => occurredAt >= from);
  const completedOrders = periodOrders.filter(({ order }) =>
    order.inventoryReservationStatus === "consumed" ||
    (order.status !== "cancelled" && (order.paymentStatus === "paid" || completedStatuses.has(order.status))),
  );
  const deliveryOrders = relevantOrders.filter(({ order }) =>
    order.orderType === "delivery" && activeDeliveryStatuses.has(order.status) && order.paymentStatus !== "refunded",
  );

  const soldQuantity = completedOrders.reduce((total, entry) => total + quantity(entry.lines), 0);
  const revenue = completedOrders.reduce((total, entry) => total + entry.lines.reduce((sum, item) => sum + item.price * item.quantity, 0), 0);
  const deliveryQuantity = deliveryOrders.reduce((total, entry) => total + quantity(entry.lines), 0);
  const reservedQuantity = relevantOrders
    .filter(({ order }) => order.inventoryReservationStatus === "reserved")
    .reduce((total, entry) => total + quantity(entry.lines), 0);

  const variants = new Map<string, { quantity: number; revenue: number }>();
  completedOrders.forEach(({ lines }) => lines.forEach((item) => {
    const label = itemVariantLabel(item);
    const current = variants.get(label) ?? { quantity: 0, revenue: 0 };
    variants.set(label, { quantity: current.quantity + item.quantity, revenue: current.revenue + item.price * item.quantity });
  }));

  const productionQuantity = (batches as ProductionBatch[])
    .filter((batch) => batch.productId === productId && toDate(batch.occurredAt) >= from)
    .reduce((total, batch) => total + Number(batch.actualGoodQuantity || 0), 0);
  const inventoryQuantity = balances.reduce((total, balance) => total + Number(balance.quantity || 0), 0);
  const recentMovements = movements
    .filter((movement) => toDate(movement.occurredAt) >= from)
    .sort((left, right) => toDate(right.occurredAt).getTime() - toDate(left.occurredAt).getTime())
    .slice(0, 6)
    .map((movement) => ({
      id: movement.id,
      type: movement.type,
      direction: movement.direction,
      quantity: movement.quantity,
      occurredAt: toDate(movement.occurredAt).toISOString(),
    } satisfies Pick<InventoryMovement, "id" | "type" | "direction" | "quantity"> & { occurredAt: string }));
  const recentOrders = relevantOrders
    .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
    .slice(0, 6)
    .map(({ order, lines, occurredAt }) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      quantity: quantity(lines),
      occurredAt: occurredAt.toISOString(),
    }));

  return NextResponse.json({
    days,
    inventoryQuantity,
    hasLedger: balances.length > 0,
    soldQuantity,
    revenue,
    deliveryQuantity,
    reservedQuantity,
    productionQuantity,
    workInProgressAvailable: false,
    variants: [...variants.entries()].map(([label, value]) => ({ label, ...value })).sort((left, right) => right.quantity - left.quantity).slice(0, 5),
    recentMovements,
    recentOrders,
  });
}
