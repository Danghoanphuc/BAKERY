import type { Product } from "@/types";

export function getProductPath(product: Pick<Product, "id"> & Partial<Pick<Product, "name">>) {
  const slug = product.name ? slugifyProductName(product.name) : "san-pham";
  return `/san-pham/${slug}--${encodeURIComponent(product.id)}`;
}

export function getProductIdFromPathSegment(segment: string) {
  const decoded = decodeURIComponent(segment);
  const separatorIndex = decoded.lastIndexOf("--");
  return separatorIndex >= 0 ? decoded.slice(separatorIndex + 2) : decoded;
}

function slugifyProductName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "san-pham";
}
