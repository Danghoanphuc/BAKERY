import type { Product } from "@/types";

const RETURN_KEY = "bakery-product-sheet-return";

export function markProductSheetReturn(productId: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(RETURN_KEY, productId);
  } catch {
    // Browser navigation still works without restoration support.
  }
}

export function consumeProductSheetReturn(products: Product[]) {
  if (typeof window === "undefined") return null;
  try {
    const productId = window.sessionStorage.getItem(RETURN_KEY);
    if (!productId) return null;
    window.sessionStorage.removeItem(RETURN_KEY);
    return products.find((product) => product.id === productId) ?? null;
  } catch {
    return null;
  }
}
