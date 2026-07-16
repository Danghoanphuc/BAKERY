import { PayOS } from "@payos/node";
import type { CartItem, Order } from "@/types";

let payosClient: PayOS | null = null;

export type PayOSPaymentLink = {
  paymentLinkId: string;
  checkoutUrl: string;
  qrCode: string;
  orderCode: number;
  status: string;
};

export function isPayOSEnabled() {
  return Boolean(
    process.env.PAYOS_CLIENT_ID &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_CHECKSUM_KEY,
  );
}

export function getPayOSClient() {
  if (!isPayOSEnabled()) {
    throw new Error("PAYOS_NOT_CONFIGURED");
  }

  payosClient ??= new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID!,
    apiKey: process.env.PAYOS_API_KEY!,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
  });

  return payosClient;
}

export function createPayOSOrderCode() {
  const timePart = Date.now() % 10000000000;
  const randomPart = Math.floor(Math.random() * 90) + 10;
  return Number(`${timePart}${randomPart}`);
}

export function getPayOSReturnUrl(order: Pick<Order, "id" | "orderNumber">) {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/checkout/payment?orderId=${encodeURIComponent(
    order.id,
  )}&orderNumber=${encodeURIComponent(
    order.orderNumber,
  )}&payment=payos`;
}

export function getPayOSCancelUrl(order: Pick<Order, "id" | "orderNumber">) {
  const baseUrl = getPublicBaseUrl();
  return `${baseUrl}/checkout/payment?orderId=${encodeURIComponent(
    order.id,
  )}&orderNumber=${encodeURIComponent(
    order.orderNumber,
  )}&payment=cancelled`;
}

export async function createOrderPaymentLink({
  order,
  orderCode,
}: {
  order: Order;
  orderCode: number;
}): Promise<PayOSPaymentLink> {
  const payos = getPayOSClient();
  const paymentLink = await payos.paymentRequests.create({
    orderCode,
    amount: Math.round(order.totalAmount),
    description: `BAKERY ${order.orderNumber}`.slice(0, 25),
    returnUrl: getPayOSReturnUrl(order),
    cancelUrl: getPayOSCancelUrl(order),
    buyerName: order.customerName,
    buyerPhone: order.customerPhone,
    buyerEmail: order.customerEmail,
    items: buildPayOSItems(order.items),
  });

  return {
    paymentLinkId: paymentLink.paymentLinkId,
    checkoutUrl: paymentLink.checkoutUrl,
    qrCode: paymentLink.qrCode,
    orderCode: paymentLink.orderCode,
    status: paymentLink.status,
  };
}

export async function cancelPayOSPaymentLink(
  orderCode: number,
  reason = "POS cancelled",
) {
  return getPayOSClient().paymentRequests.cancel(orderCode, reason);
}

function buildPayOSItems(items: CartItem[]) {
  return items.slice(0, 20).map((item) => ({
    name: item.productName.slice(0, 100),
    quantity: item.quantity,
    price: Math.round(item.price),
  }));
}

function getPublicBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
