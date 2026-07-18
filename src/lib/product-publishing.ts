import type { Category, Product } from "@/types";
import { findCategoryForProduct } from "@/lib/product-category";
import { getProductPath } from "@/lib/product-path";
import { getPublicBaseUrl } from "@/lib/public-url";
import { getProductStartingPrice } from "@/features/product/product-cart";

export { getProductPath };

export type ProductAvailability = "in_stock" | "out_of_stock" | "preorder";

export type ProductFeedItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: "VND";
  description: string;
  ingredients: string[];
  allergens: string[];
  shelf_life: string;
  storage: string;
  availability: ProductAvailability;
  image: string;
  url: string;
  tags: string[];
  sale_area: string[];
  available_for_delivery: boolean;
  available_for_pickup: boolean;
  requires_preorder: boolean;
  preparation_time_minutes?: number;
  social_title: string;
  social_description: string;
  social_image: string;
  social_hashtags: string[];
};

const DEFAULT_DESCRIPTION =
  "Dat banh tuoi giao trong ngay, phu hop an sang, an xe va tiec nho.";
const DEFAULT_STORAGE = "Bao quan noi thoang mat, dung ngon nhat trong ngay.";
const DEFAULT_SHELF_LIFE = "1 ngay";
const PRODUCT_BRAND_NAME = "Ngọt & Trà";

export function getSiteUrl() {
  return getPublicBaseUrl();
}

export function getProductUrl(product: Pick<Product, "id">) {
  return `${getSiteUrl()}${getProductPath(product)}`;
}

export function getCategoryName(
  product: Product,
  categories: Category[],
  fallback = "San pham",
) {
  return findCategoryForProduct(product, categories)?.name ?? fallback;
}

export function getProductDescription(product: Product) {
  return (
    cleanText(product.social?.description) ||
    cleanText(product.shortDescription) ||
    cleanText(product.description) ||
    DEFAULT_DESCRIPTION
  );
}

export function getProductSocialTitle(product: Product) {
  return cleanText(product.social?.title) || product.displayName || product.name;
}

export function getProductSocialImage(product: Product) {
  return absoluteUrl(product.social?.imageUrl || product.imageUrl);
}

export function getProductAvailability(product: Product): ProductAvailability {
  if (product.requiresPreorder) return "preorder";
  if (
    product.isAvailable === false ||
    (typeof product.stock === "number" && product.stock <= 0)
  ) {
    return "out_of_stock";
  }
  return "in_stock";
}

export function buildProductFeedItem(
  product: Product,
  categoryName: string,
): ProductFeedItem {
  return {
    id: product.id,
    name: product.displayName || product.name,
    category: categoryName,
    price: getProductStartingPrice(product),
    currency: "VND",
    description: getProductDescription(product),
    ingredients: product.ingredients ?? [],
    allergens: product.allergens ?? [],
    shelf_life: product.shelfLife ?? DEFAULT_SHELF_LIFE,
    storage: product.storage ?? DEFAULT_STORAGE,
    availability: getProductAvailability(product),
    image: absoluteUrl(product.imageUrl),
    url: getProductUrl(product),
    tags: product.tags ?? [],
    sale_area: product.saleArea ?? [],
    available_for_delivery: product.availableForDelivery ?? true,
    available_for_pickup: product.availableForPickup ?? true,
    requires_preorder: product.requiresPreorder ?? false,
    preparation_time_minutes: product.preparationTimeMinutes,
    social_title: getProductSocialTitle(product),
    social_description: getProductDescription(product),
    social_image: getProductSocialImage(product),
    social_hashtags: product.social?.hashtags ?? [],
  };
}

export function buildProductJsonLd(feedItem: ProductFeedItem) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    productID: feedItem.id,
    name: feedItem.social_title,
    description: feedItem.social_description,
    image: feedItem.social_image,
    category: feedItem.category,
    url: feedItem.url,
    brand: {
      "@type": "Brand",
      name: PRODUCT_BRAND_NAME,
    },
    offers: {
      "@type": "Offer",
      price: feedItem.price,
      priceCurrency: feedItem.currency,
      availability:
        feedItem.availability === "out_of_stock"
          ? "https://schema.org/OutOfStock"
          : feedItem.availability === "preorder"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/InStock",
      url: feedItem.url,
    },
  };
}

export function absoluteUrl(url: string) {
  if (!url) return `${getSiteUrl()}/images/product-placeholder.jpg`;
  if (/^https?:\/\//i.test(url)) return url;
  return `${getSiteUrl()}${url.startsWith("/") ? url : `/${url}`}`;
}

function cleanText(value?: string) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}
