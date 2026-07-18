import type { Product, SizeOption } from "@/types";

export type SizePresentation = {
  title: string;
  servings?: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  price: number;
};

export function getSizePresentation(
  product: Product,
  option: SizeOption,
): SizePresentation {
  const parenthetical = option.label.match(/\(([^)]+)\)/)?.[1];
  return {
    title: option.label.replace(/\s*\([^)]+\)\s*/, "").trim() || option.label,
    servings: option.servings || parenthetical,
    description: option.description,
    imageUrl: option.imageUrl,
    badge: option.badge,
    price: product.price + option.priceAdjustment,
  };
}

export function getServingLabel(product: Product, selectedSize?: string) {
  const size = product.sizeOptions?.find((option) => option.id === selectedSize);
  if (size) return getSizePresentation(product, size).servings;
  return product.servingSuggestion;
}

export function getFulfillmentPromise(
  product: Product,
  deliveryMode: "delivery" | "pickup",
  now = new Date(),
) {
  const leadMinutes = product.requiresPreorder
    ? Math.max(0, (product.preorderMinHours ?? 0) * 60)
    : Math.max(0, product.preparationTimeMinutes ?? 30);
  const readyAt = new Date(now.getTime() + leadMinutes * 60_000);
  const sameDay = readyAt.toDateString() === now.toDateString();
  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(readyAt);
  const date = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(readyAt);
  const action = deliveryMode === "pickup" ? "nhận tại quán" : "giao đến bạn";

  return {
    headline: `Dự kiến ${action} từ ${time}${sameDay ? " hôm nay" : ` ngày ${date}`}`,
    detail: product.requiresPreorder
      ? `Sản phẩm cần đặt trước ít nhất ${product.preorderMinHours ?? 0} giờ.`
      : `Thời gian chuẩn bị khoảng ${product.preparationTimeMinutes ?? 30} phút.`,
  };
}

export function getProductOrderAvailability(
  product: Product,
  mode: "delivery" | "pickup",
) {
  if (product.isAvailable === false) {
    return { canOrder: false, label: "Tạm ngừng bán", shortLabel: "Tạm ngừng bán" };
  }
  if (product.stock !== undefined && product.stock <= 0) {
    return { canOrder: false, label: "Đã hết hàng", shortLabel: "Hết hàng" };
  }
  if (mode === "pickup" && product.availableForPickup === false) {
    return { canOrder: false, label: "Chỉ hỗ trợ giao hàng", shortLabel: "Không hỗ trợ nhận tại quán" };
  }
  if (mode === "delivery" && product.availableForDelivery === false) {
    return { canOrder: false, label: "Chỉ nhận tại quán", shortLabel: "Không hỗ trợ giao hàng" };
  }
  if (product.availableToday === false && !product.requiresPreorder) {
    return { canOrder: false, label: "Không bán hôm nay", shortLabel: "Không bán hôm nay" };
  }
  if (product.requiresPreorder) {
    const hours = product.preorderMinHours ?? 0;
    return {
      canOrder: true,
      label: hours > 0 ? `Đặt trước ít nhất ${hours} giờ` : "Cần đặt trước",
      shortLabel: "Đặt trước",
    };
  }
  return {
    canOrder: true,
    label: mode === "pickup" ? "Có thể nhận tại quán" : "Có thể giao tận nơi",
    shortLabel: "Thêm vào giỏ",
  };
}
