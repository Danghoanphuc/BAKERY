import type { CartItem } from "@/types/cart";
import type { Order, OrderStatus, OrderType, PaymentStatus } from "@/types/order";

export type HistoryFilter = "all" | "active" | "pickup" | "delivery" | "completed";

export type OrderHistoryAction = "pay" | "track" | "pickup" | "buy-again" | "view";

export interface OrderHistoryViewItem {
  id: string;
  orderNumber: string;
  title: string;
  itemCount: number;
  items: CartItem[];
  createdAt: Date;
  dateLabel: string;
  totalAmount: number;
  pointsEarned: number;
  status: OrderStatus;
  statusLabel: string;
  statusTone: "success" | "warning" | "danger" | "muted";
  orderType: OrderType;
  fulfillmentLabel: string;
  imageUrl: string;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  payosCheckoutUrl?: string;
  deliveryAddress?: string;
  pickupTime?: string;
  voucherCode?: string;
  discountAmount?: number;
  deliveryFee?: number;
  productSubtotal?: number;
  action: OrderHistoryAction;
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị",
  ready: "Sẵn sàng nhận",
  processing: "Đang xử lý",
  completed: "Hoàn thành",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

const activeStatuses = new Set<OrderStatus>([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "processing",
]);

export function mapOrderToHistoryItem(order: Order): OrderHistoryViewItem {
  const items = parseOrderItems(order.items);
  const firstItem = items[0];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const status = normalizeOrderStatus(order.status);
  const paymentStatus = normalizePaymentStatus(order.paymentStatus);
  const createdAt = toDateSafe(order.createdAt);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    title: firstItem?.productName || "Đơn hàng",
    itemCount,
    items,
    createdAt,
    dateLabel: formatOrderDate(createdAt),
    totalAmount: order.totalAmount,
    pointsEarned:
      typeof order.loyaltyPointsEarned === "number"
        ? order.loyaltyPointsEarned
        : Math.floor(order.totalAmount / 10000),
    status,
    statusLabel: getStatusLabel(order, status, paymentStatus),
    statusTone: getStatusTone(status, paymentStatus),
    orderType: normalizeOrderType(order.orderType),
    fulfillmentLabel: getFulfillmentLabel(order),
    imageUrl: firstItem?.imageUrl || getLooseItemImage(firstItem) || fallbackOrderImage,
    paymentStatus,
    paymentMethod: order.paymentMethod,
    payosCheckoutUrl: order.payosCheckoutUrl,
    deliveryAddress: order.deliveryAddress,
    pickupTime: order.pickupTime,
    voucherCode: order.voucherCode,
    discountAmount: order.discountAmount,
    deliveryFee: order.deliveryFee,
    productSubtotal: order.productSubtotal,
    action: getPrimaryAction(order, status, paymentStatus),
  };
}

export function filterHistoryOrders(
  orders: OrderHistoryViewItem[],
  filter: HistoryFilter,
  query: string,
) {
  const normalizedQuery = normalizeSearchText(query);

  return orders.filter((order) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "active" && activeStatuses.has(order.status)) ||
      (filter === "completed" &&
        (order.status === "completed" || order.status === "delivered")) ||
      order.orderType === filter;

    if (!matchesFilter) return false;
    if (!normalizedQuery) return true;

    return normalizeSearchText(
      [
        order.orderNumber,
        order.title,
        order.statusLabel,
        order.fulfillmentLabel,
        ...order.items.map((item) => item.productName),
      ].join(" "),
    ).includes(normalizedQuery);
  });
}

export function getActionLabel(action: OrderHistoryAction) {
  if (action === "pay") return "Thanh toán";
  if (action === "pickup") return "Mã nhận";
  if (action === "buy-again") return "Mua lại";
  if (action === "track") return "Theo dõi";
  return "Chi tiết";
}

export function isActiveOrder(status: OrderStatus) {
  return activeStatuses.has(status);
}

function parseOrderItems(value: unknown): CartItem[] {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeCartItem(item))
      .filter((item): item is CartItem => Boolean(item));
  } catch {
    return [];
  }
}

function normalizeCartItem(value: unknown): CartItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const productId = stringValue(item.productId) || stringValue(item.id);
  const productName = stringValue(item.productName) || stringValue(item.name);
  const quantity = numberValue(item.quantity) || 1;
  const price = numberValue(item.price);

  if (!productId || !productName || typeof price !== "number") return null;

  return {
    cartItemId:
      stringValue(item.cartItemId) ||
      [productId, item.selectedSize, item.selectedFlavor, item.customMessage, item.candles]
        .filter(Boolean)
        .join("|") ||
      productId,
    productId,
    productName,
    quantity,
    price,
    imageUrl: stringValue(item.imageUrl) || stringValue(item.image) || fallbackOrderImage,
    selectedSize: stringValue(item.selectedSize),
    selectedFlavor: stringValue(item.selectedFlavor),
    customMessage: stringValue(item.customMessage),
    candles: numberValue(item.candles),
  };
}

function getLooseItemImage(item?: CartItem) {
  return item?.imageUrl;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeOrderStatus(status: string): OrderStatus {
  if (
    status === "pending" ||
    status === "confirmed" ||
    status === "preparing" ||
    status === "ready" ||
    status === "processing" ||
    status === "completed" ||
    status === "delivered" ||
    status === "cancelled"
  ) {
    return status;
  }

  return "pending";
}

function normalizeOrderType(type: string): OrderType {
  if (type === "pickup" || type === "delivery" || type === "preorder") return type;
  return "delivery";
}

function normalizePaymentStatus(status?: string): PaymentStatus {
  if (status === "pending" || status === "paid" || status === "refunded") return status;
  return "unpaid";
}

function getStatusLabel(
  order: Order,
  status: OrderStatus,
  paymentStatus: PaymentStatus,
) {
  if (
    order.paymentMethod === "bank_transfer" &&
    paymentStatus === "pending" &&
    status !== "cancelled"
  ) {
    return "Chờ chuyển khoản";
  }

  if (status === "cancelled" && order.cancelReason?.toLowerCase().includes("quá hạn")) {
    return "Thanh toán thất bại";
  }

  return statusLabels[status];
}

function getStatusTone(
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): OrderHistoryViewItem["statusTone"] {
  if (status === "cancelled" || paymentStatus === "refunded") return "danger";
  if (status === "completed" || status === "delivered" || status === "ready") {
    return "success";
  }
  if (status === "pending" || status === "confirmed" || status === "preparing") {
    return "warning";
  }
  return "muted";
}

function getFulfillmentLabel(order: Order) {
  if (order.orderType === "pickup") return "Nhận tại quán";
  if (order.orderType === "preorder") return "Đặt trước";
  return order.deliveryAddress ? "Giao tận nơi" : "Giao hàng";
}

function getPrimaryAction(
  order: Order,
  status: OrderStatus,
  paymentStatus: PaymentStatus,
): OrderHistoryAction {
  if (
    order.paymentMethod === "bank_transfer" &&
    paymentStatus === "pending" &&
    order.payosCheckoutUrl &&
    status !== "cancelled"
  ) {
    return "pay";
  }
  if (status === "ready" && order.orderType === "pickup") return "pickup";
  if (status === "completed" || status === "delivered" || status === "cancelled") {
    return "buy-again";
  }
  if (activeStatuses.has(status)) return "track";
  return "view";
}

function formatOrderDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateSafe(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  if (value && typeof value === "object") {
    const maybeDate = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybeDate.toDate === "function") return maybeDate.toDate();
    if (typeof maybeDate.seconds === "number") {
      return new Date(maybeDate.seconds * 1000);
    }
  }
  return new Date();
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const fallbackOrderImage =
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=85";
