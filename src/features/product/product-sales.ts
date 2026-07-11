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
