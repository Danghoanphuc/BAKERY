import type { FlavorOption, Product, SizeOption } from "@/types";

export type ProductFilter = "all" | "selling" | "hidden" | "lowStock" | "outOfStock";

export type ProductFormData = {
  name: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  description: string;
  availableForDelivery: boolean;
  availableForPickup: boolean;
  requiresMessage: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  stock: number;
  isAvailable: boolean;
  sizeOptions: SizeOption[];
  flavorOptions: FlavorOption[];
  tags: string;
  ingredients: string;
  occasionTags: string;
  dietaryTags: string;
  allergens: string;
  searchKeywords: string;
  shelfLife: string;
  storage: string;
  saleArea: string;
  galleryImages: string;
  pickupBranchIds: string;
  preparationTimeMinutes: number;
  requiresPreorder: boolean;
  preorderMinHours: number;
  availableToday: boolean;
  sortPriority: number;
};

export function createEmptyProductForm(categoryId = ""): ProductFormData {
  return {
    name: "",
    price: 0,
    imageUrl: "",
    categoryId,
    description: "",
    availableForDelivery: true,
    availableForPickup: true,
    requiresMessage: false,
    isFeatured: false,
    isNew: false,
    isBestseller: false,
    stock: 0,
    isAvailable: true,
    sizeOptions: [],
    flavorOptions: [],
    tags: "",
    ingredients: "",
    occasionTags: "",
    dietaryTags: "",
    allergens: "",
    searchKeywords: "",
    shelfLife: "",
    storage: "",
    saleArea: "",
    galleryImages: "",
    pickupBranchIds: "",
    preparationTimeMinutes: 30,
    requiresPreorder: false,
    preorderMinHours: 0,
    availableToday: true,
    sortPriority: 0,
  };
}

export function productToForm(product: Product, fallbackCategoryId = ""): ProductFormData {
  return {
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId ?? fallbackCategoryId,
    description: product.description ?? "",
    availableForDelivery: product.availableForDelivery ?? true,
    availableForPickup: product.availableForPickup ?? true,
    requiresMessage: product.requiresMessage ?? false,
    isFeatured: product.isFeatured ?? false,
    isNew: product.isNew ?? false,
    isBestseller: product.isBestseller ?? false,
    stock: product.stock ?? 0,
    isAvailable: product.isAvailable ?? true,
    sizeOptions: product.sizeOptions ?? [],
    flavorOptions: product.flavorOptions ?? [],
    tags: joinTags(product.tags),
    ingredients: joinTags(product.ingredients),
    occasionTags: joinTags(product.occasionTags),
    dietaryTags: joinTags(product.dietaryTags),
    allergens: joinTags(product.allergens),
    searchKeywords: joinTags(product.searchKeywords),
    shelfLife: product.shelfLife ?? "",
    storage: product.storage ?? "",
    saleArea: joinTags(product.saleArea),
    galleryImages: joinTags(product.galleryImages),
    pickupBranchIds: joinTags(product.pickupBranchIds),
    preparationTimeMinutes: product.preparationTimeMinutes ?? 30,
    requiresPreorder: product.requiresPreorder ?? false,
    preorderMinHours: product.preorderMinHours ?? 0,
    availableToday: product.availableToday ?? true,
    sortPriority: product.sortPriority ?? 0,
  };
}

export function productFormToPayload(formData: ProductFormData) {
  return {
    ...formData,
    price: Number(formData.price) || 0,
    stock: Number(formData.stock) || 0,
    preparationTimeMinutes: Number(formData.preparationTimeMinutes) || 0,
    preorderMinHours: Number(formData.preorderMinHours) || 0,
    sortPriority: Number(formData.sortPriority) || 0,
    tags: splitTags(formData.tags),
    ingredients: splitTags(formData.ingredients),
    occasionTags: splitTags(formData.occasionTags),
    dietaryTags: splitTags(formData.dietaryTags),
    allergens: splitTags(formData.allergens),
    searchKeywords: splitTags(formData.searchKeywords),
    shelfLife: formData.shelfLife.trim(),
    storage: formData.storage.trim(),
    saleArea: splitTags(formData.saleArea),
    galleryImages: splitTags(formData.galleryImages),
    pickupBranchIds: splitTags(formData.pickupBranchIds),
  };
}

export function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinTags(value?: string[]) {
  return (value ?? []).join(", ");
}

export function mergeCommaList(current: string, additions: string[]) {
  const merged = [...splitTags(current), ...additions]
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(merged)).join(", ");
}
