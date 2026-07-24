import type {
  FlavorOption,
  Product,
  ProductFeedMetrics,
  ProductItemType,
  ProductLifecycleStatus,
  ProductionStep,
  ProductVariantCombination,
  ProductWorkspaceCardConfig,
  SizeOption,
} from "@/types";

export type ProductFilter = "all" | "selling" | "hidden" | "lowStock" | "outOfStock";

export type ProductFormData = {
  name: string;
  displayName: string;
  shortDescription: string;
  itemType: ProductItemType;
  lifecycleStatus: ProductLifecycleStatus;
  workspaceCards: Partial<Record<string, ProductWorkspaceCardConfig>>;
  productionSteps: ProductionStep[];
  manufacturingLeadMinutes: number;
  manufacturingOutputQuantity: number;
  manufacturingOutputUnit: string;
  feedMetrics?: ProductFeedMetrics;
  price: number;
  imageUrl: string;
  categoryId: string;
  description: string;
  sellingPoints: string;
  servingSuggestion: string;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
  socialHashtags: string;
  availableForDelivery: boolean;
  availableForPickup: boolean;
  requiresMessage: boolean;
  isFeatured: boolean;
  isNew: boolean;
  isBestseller: boolean;
  stock: number;
  sku: string;
  barcode: string;
  isAvailable: boolean;
  ingredientsCost: number;
  packagingCost: number;
  laborCost: number;
  overheadCost: number;
  wastePercent: number;
  targetGrossMarginPercent: number;
  sizeOptions: SizeOption[];
  flavorOptions: FlavorOption[];
  variantCombinations: ProductVariantCombination[];
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
  dailyStock: number;
  availableFrom: string;
  availableUntil: string;
  sweetnessLevel: "low" | "medium" | "high";
  servingSize: string;
  rankingBoost: number;
  requiresPreorder: boolean;
  preorderMinHours: number;
  availableToday: boolean;
  sortPriority: number;
};

export function createEmptyProductForm(categoryId = ""): ProductFormData {
  return {
    name: "",
    displayName: "",
    shortDescription: "",
    itemType: "finished_good",
    lifecycleStatus: "active",
    workspaceCards: {},
    productionSteps: [],
    manufacturingLeadMinutes: 0,
    manufacturingOutputQuantity: 1,
    manufacturingOutputUnit: "cái",
    feedMetrics: undefined,
    price: 0,
    imageUrl: "",
    categoryId,
    description: "",
    sellingPoints: "",
    servingSuggestion: "",
    socialTitle: "",
    socialDescription: "",
    socialImageUrl: "",
    socialHashtags: "",
    availableForDelivery: true,
    availableForPickup: true,
    requiresMessage: false,
    isFeatured: false,
    isNew: false,
    isBestseller: false,
    sku: "",
    barcode: "",
    stock: 0,
    isAvailable: true,
    ingredientsCost: 0,
    packagingCost: 0,
    laborCost: 0,
    overheadCost: 0,
    wastePercent: 0,
    targetGrossMarginPercent: 50,
    sizeOptions: [],
    flavorOptions: [],
    variantCombinations: [],
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
    dailyStock: 0,
    availableFrom: "",
    availableUntil: "",
    sweetnessLevel: "medium",
    servingSize: "",
    rankingBoost: 0,
    requiresPreorder: false,
    preorderMinHours: 0,
    availableToday: true,
    sortPriority: 0,
  };
}

export function productToForm(product: Product, fallbackCategoryId = ""): ProductFormData {
  return {
    name: product.name,
    displayName: product.displayName ?? product.name,
    shortDescription: product.shortDescription ?? "",
    itemType: product.itemType ?? "finished_good",
    lifecycleStatus:
      product.lifecycleStatus ?? (product.isAvailable === false ? "inactive" : "active"),
    workspaceCards: product.workspaceCards ?? {},
    productionSteps: product.productionSteps ?? [],
    manufacturingLeadMinutes: product.manufacturingLeadMinutes ?? 0,
    manufacturingOutputQuantity: product.manufacturingOutputQuantity ?? 1,
    manufacturingOutputUnit: product.manufacturingOutputUnit ?? "cái",
    feedMetrics: product.feedMetrics,
    price: product.price,
    imageUrl: product.imageUrl,
    categoryId: product.categoryId ?? fallbackCategoryId,
    description: product.description ?? "",
    sellingPoints: joinTags(product.sellingPoints),
    servingSuggestion: product.servingSuggestion ?? "",
    socialTitle: product.social?.title ?? "",
    socialDescription: product.social?.description ?? "",
    socialImageUrl: product.social?.imageUrl ?? "",
    socialHashtags: joinTags(product.social?.hashtags),
    availableForDelivery: product.availableForDelivery ?? true,
    availableForPickup: product.availableForPickup ?? true,
    requiresMessage: product.requiresMessage ?? false,
    isFeatured: product.isFeatured ?? false,
    isNew: product.isNew ?? false,
    isBestseller: product.isBestseller ?? false,
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    stock: product.stock ?? 0,
    isAvailable: product.isAvailable ?? true,
    ingredientsCost: product.ingredientsCost ?? 0,
    packagingCost: product.packagingCost ?? 0,
    laborCost: product.laborCost ?? 0,
    overheadCost: product.overheadCost ?? 0,
    wastePercent: product.wastePercent ?? 0,
    targetGrossMarginPercent: product.targetGrossMarginPercent ?? 50,
    sizeOptions: product.sizeOptions ?? [],
    flavorOptions: product.flavorOptions ?? [],
    variantCombinations: product.variantCombinations ?? [],
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
    dailyStock: product.dailyStock ?? product.stock ?? 0,
    availableFrom: product.availableFrom ?? "",
    availableUntil: product.availableUntil ?? "",
    sweetnessLevel: product.sweetnessLevel ?? "medium",
    servingSize: product.servingSize ?? "",
    rankingBoost: product.rankingBoost ?? 0,
    requiresPreorder: product.requiresPreorder ?? false,
    preorderMinHours: product.preorderMinHours ?? 0,
    availableToday: product.availableToday ?? true,
    sortPriority: product.sortPriority ?? 0,
  };
}

export function productFormToPayload(formData: ProductFormData) {
  return {
    name: formData.name.trim(),
    displayName: formData.displayName.trim(),
    shortDescription: formData.shortDescription.trim(),
    itemType: formData.itemType,
    lifecycleStatus: formData.lifecycleStatus,
    workspaceCards: formData.workspaceCards,
    productionSteps: formData.productionSteps,
    manufacturingLeadMinutes: Number(formData.manufacturingLeadMinutes) || 0,
    manufacturingOutputQuantity: Number(formData.manufacturingOutputQuantity) || 1,
    manufacturingOutputUnit: formData.manufacturingOutputUnit.trim() || "cái",
    price: Number(formData.price) || 0,
    imageUrl: formData.imageUrl.trim(),
    categoryId: formData.categoryId.trim(),
    description: formData.description.trim(),
    sellingPoints: splitTags(formData.sellingPoints),
    servingSuggestion: formData.servingSuggestion.trim(),
    social: {
      title: formData.socialTitle.trim(),
      description: formData.socialDescription.trim(),
      imageUrl: formData.socialImageUrl.trim(),
      hashtags: splitTags(formData.socialHashtags),
    },
    availableForDelivery: formData.availableForDelivery,
    availableForPickup: formData.availableForPickup,
    requiresMessage: formData.requiresMessage,
    isFeatured: formData.isFeatured,
    isNew: formData.isNew,
    isBestseller: formData.isBestseller,
    stock: Number(formData.stock) || 0,
    sku: formData.sku.trim(),
    barcode: formData.barcode.trim(),
    isAvailable:
      formData.lifecycleStatus === "active" ? formData.isAvailable : false,
    ingredientsCost: Number(formData.ingredientsCost) || 0,
    packagingCost: Number(formData.packagingCost) || 0,
    laborCost: Number(formData.laborCost) || 0,
    overheadCost: Number(formData.overheadCost) || 0,
    wastePercent: Number(formData.wastePercent) || 0,
    targetGrossMarginPercent: Number(formData.targetGrossMarginPercent) || 0,
    sizeOptions: formData.sizeOptions,
    flavorOptions: formData.flavorOptions,
    variantCombinations: formData.variantCombinations,
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
    preparationTimeMinutes: Number(formData.preparationTimeMinutes) || 0,
    dailyStock: Number(formData.dailyStock) || 0,
    availableFrom: formData.availableFrom.trim(),
    availableUntil: formData.availableUntil.trim(),
    sweetnessLevel: formData.sweetnessLevel,
    servingSize: formData.servingSize.trim(),
    rankingBoost: Number(formData.rankingBoost) || 0,
    requiresPreorder: formData.requiresPreorder,
    preorderMinHours: Number(formData.preorderMinHours) || 0,
    availableToday: formData.availableToday,
    sortPriority: Number(formData.sortPriority) || 0,
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
