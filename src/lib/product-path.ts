import type { Product } from "@/types";

export function getProductPath(product: Pick<Product, "id">) {
  return `/san-pham/${encodeURIComponent(product.id)}`;
}
