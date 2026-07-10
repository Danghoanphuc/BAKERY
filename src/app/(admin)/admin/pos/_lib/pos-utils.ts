import type { CartItem, Product } from "@/types";
import type { SelectedVoucher } from "@/types/voucher";
export { resolvePaymentQrImageSrc } from "@/lib/payment-qr";

export type PosPaymentMethod =
  | "cash"
  | "bank_transfer"
  | "card"
  | "wallet"
  | "other";

export type PosCustomer = {
  id?: string;
  name: string;
  phone: string;
  tier?: string;
  loyaltyPoints?: number;
  totalOrders?: number;
  lastOrderAt?: string;
};

export type PosCustomerSummary = Required<Pick<PosCustomer, "id" | "name" | "phone">> &
  Pick<PosCustomer, "tier" | "loyaltyPoints" | "totalOrders" | "lastOrderAt">;

export type PosVoucherPreview = {
  voucher: {
    id: string;
    code: string;
    title: string;
    discountType: "percent" | "fixed";
    discountValue: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
  };
  ok: boolean;
  pricing?: {
    subtotal: number;
    discountAmount: number;
    totalAfterDiscount: number;
    isEligible: boolean;
    reason?: string;
  };
  reason?: string;
  estimatedDiscount: number;
};

export type PosCheckoutResult = {
  id: string;
  orderNumber: string;
  totalAmount: number;
  discountAmount: number;
  loyaltyPointsEarned: number;
  paymentStatus?: "unpaid" | "pending" | "paid" | "refunded";
  paymentMethod?: PosPaymentMethod;
  payos?: {
    checkoutUrl: string;
    qrCode: string;
    paymentLinkId: string;
    orderCode: number;
  };
};

export type HeldPosOrder = {
  id: string;
  items: CartItem[];
  customer: PosCustomer;
  voucher?: SelectedVoucher;
  note?: string;
  createdAt: string;
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").trim();
}

export function productNeedsCustomization(product: Product) {
  return Boolean(
    product.requiresMessage ||
      product.requiresPreorder ||
      (product.sizeOptions?.length ?? 0) > 0 ||
      (product.flavorOptions?.length ?? 0) > 0,
  );
}

export function isProductSellableToday(product: Product) {
  return (
    product.isAvailable !== false &&
    product.availableForPickup !== false &&
    product.availableToday !== false &&
    !product.requiresPreorder &&
    (product.stock ?? 1) > 0
  );
}

export function getProductStockLabel(product: Product) {
  if (product.isAvailable === false) return "Đang ẩn";
  if (product.availableForPickup === false) return "Không pickup";
  if (product.availableToday === false) return "Không bán hôm nay";
  if ((product.stock ?? 1) <= 0) return "Hết hàng";
  if ((product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5) {
    return `Còn ${product.stock}`;
  }
  return null;
}

export function buildPosCartItem(product: Product, quantity = 1) {
  return {
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    price: product.price,
    quantity,
  };
}

export function buildReceiptText({
  order,
  items,
  subtotal,
  customer,
}: {
  order: PosCheckoutResult;
  items: CartItem[];
  subtotal: number;
  customer: PosCustomer;
}) {
  const lines = [
    "BAKERY POS",
    `Đơn: ${order.orderNumber}`,
    customer.name.trim() ? `Khách: ${customer.name.trim()}` : "Khách: Khách lẻ",
    customer.phone.trim() ? `SĐT: ${customer.phone.trim()}` : "",
    "------------------------------",
    ...items.map(
      (item) =>
        `${item.productName} x${item.quantity} - ${formatCurrency(
          item.price * item.quantity,
        )}`,
    ),
    "------------------------------",
    `Tạm tính: ${formatCurrency(subtotal)}`,
    `Giảm giá: -${formatCurrency(order.discountAmount)}`,
    `Tổng tiền: ${formatCurrency(order.totalAmount)}`,
  ].filter(Boolean);

  return lines.join("\n");
}
