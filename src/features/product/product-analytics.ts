export type ProductFunnelEvent =
  | "product_sheet_open"
  | "view_full_product_clicked"
  | "product_page_view"
  | "variant_selected"
  | "variant_validation_error"
  | "add_to_cart"
  | "buy_now"
  | "checkout_started";

export type ProductFunnelPayload = {
  productId: string;
  source?: "sheet" | "page" | "quick_add";
  sizeId?: string;
  flavorId?: string;
  quantity?: number;
  value?: number;
  reason?: string;
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackProductEvent(
  event: ProductFunnelEvent,
  payload: ProductFunnelPayload,
) {
  if (typeof window === "undefined") return;
  const detail = { event, ...payload };
  window.dispatchEvent(new CustomEvent("bakery:product-funnel", { detail }));
  window.dataLayer?.push(detail);
}
