import { AlertTriangle, PackageCheck, PackageX } from "lucide-react";
import type { Category, Product } from "@/types";
import {
  getProductStockQty,
  isProductListed,
} from "@/lib/product-availability";
import { findCategoryForProduct } from "@/lib/product-category";
import type { ProductFilter, ProductFormData } from "./product-form";
import { mergeCommaList, splitTags } from "./product-form";

export function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price || 0);
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getStockStatus(stock: number) {
  if (stock <= 0) {
    return {
      label: "Hết hàng",
      tone: "text-red-700 bg-red-50 border-red-200",
      icon: PackageX,
    };
  }

  if (stock < 10) {
    return {
      label: "Sắp hết",
      tone: "text-amber-700 bg-amber-50 border-amber-200",
      icon: AlertTriangle,
    };
  }

  return {
    label: "Còn hàng",
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: PackageCheck,
  };
}

export function resolveInventoryCategoryName(
  product: Product,
  categories: Category[],
) {
  return findCategoryForProduct(product, categories)?.name ?? "";
}

export function getInventoryStats(products: Product[]) {
  return {
    selling: products.filter(isProductListed).length,
    lowStock: products.filter((product) => {
      const stock = getProductStockQty(product);
      return stock > 0 && stock < 10;
    }).length,
    inventoryValue: products.reduce(
      (total, product) =>
        total + (product.price || 0) * getProductStockQty(product),
      0,
    ),
  };
}

export function filterProducts(
  products: Product[],
  categories: Category[],
  searchTerm: string,
  filter: ProductFilter,
) {
  const keyword = normalizeText(searchTerm);

  return products.filter((product) => {
    const categoryName = resolveInventoryCategoryName(product, categories);
    const searchHaystack = normalizeText(
      [
        product.name,
        product.description,
        categoryName,
        ...(product.tags ?? []),
        ...(product.searchKeywords ?? []),
      ].join(" "),
    );
    const stock = getProductStockQty(product);
    const listed = isProductListed(product);

    const matchesSearch = !keyword || searchHaystack.includes(keyword);
    const matchesFilter =
      filter === "all" ||
      (filter === "selling" && listed) ||
      (filter === "hidden" && !listed) ||
      (filter === "lowStock" && stock > 0 && stock < 10) ||
      (filter === "outOfStock" && stock <= 0);

    return matchesSearch && matchesFilter;
  });
}

export function applyProductAssistant(
  formData: ProductFormData,
  categoryName: string,
) {
  const source = normalizeText(
    `${formData.name} ${formData.description} ${categoryName}`,
  );
  const tags: string[] = [];
  const occasionTags: string[] = [];
  const dietaryTags: string[] = [];
  const allergens: string[] = [];
  const searchKeywords: string[] = [];

  if (source.includes("sinh nhat") || source.includes("birthday")) {
    occasionTags.push("sinh nhật");
    searchKeywords.push("bánh sinh nhật", "bánh tặng sinh nhật");
  }

  if (source.includes("chocolate") || source.includes("socola")) {
    tags.push("socola");
    searchKeywords.push("bánh socola");
  }

  if (source.includes("matcha")) {
    tags.push("matcha");
    searchKeywords.push("bánh matcha");
  }

  if (source.includes("croissant")) {
    tags.push("croissant", "bánh nướng");
    searchKeywords.push("croissant bơ", "bánh ăn sáng");
  }

  if (source.includes("healthy") || source.includes("it ngot")) {
    dietaryTags.push("ít ngọt", "healthy");
    searchKeywords.push("bánh ít ngọt", "bánh healthy");
  }

  if (source.includes("keto")) {
    dietaryTags.push("keto");
    searchKeywords.push("bánh keto");
  }

  if (source.includes("vegan") || source.includes("chay")) {
    dietaryTags.push("vegan");
    searchKeywords.push("bánh chay");
  }

  if (
    source.includes("banh") ||
    source.includes("kem") ||
    source.includes("cookie") ||
    source.includes("croissant")
  ) {
    allergens.push("sữa", "trứng", "gluten");
  }

  if (
    source.includes("hanh nhan") ||
    source.includes("almond") ||
    source.includes("hat")
  ) {
    allergens.push("hạt");
  }

  if (formData.availableToday) {
    searchKeywords.push("có sẵn hôm nay", "giao hôm nay");
  }

  if (formData.requiresMessage) {
    tags.push("ghi lời chúc");
    searchKeywords.push("bánh tặng", "bánh ghi chữ");
  }

  return {
    ...formData,
    tags: mergeCommaList(formData.tags, tags),
    occasionTags: mergeCommaList(formData.occasionTags, occasionTags),
    dietaryTags: mergeCommaList(formData.dietaryTags, dietaryTags),
    allergens: mergeCommaList(formData.allergens, allergens),
    searchKeywords: mergeCommaList(formData.searchKeywords, [
      ...searchKeywords,
      formData.name.trim(),
      categoryName.trim(),
      ...splitTags(formData.tags),
    ]),
  };
}
