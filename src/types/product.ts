export interface SizeOption {
  id: string;
  label: string; // e.g., "16cm", "20cm", "24cm"
  priceAdjustment: number; // Additional price (0 for base size, positive for larger)
  servings?: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
  sku?: string;           // VD: "CAKE-20CM"
  barcode?: string;       // VD: "8931234567890"
  stock?: number;         // Tồn kho riêng size này
}

export interface FlavorOption {
  id: string;
  label: string; // e.g., "Chocolate", "Vanilla", "Strawberry"
  description?: string;
  imageUrl?: string;
  badge?: string;
  sku?: string;           // VD: "VANILLA"
  barcode?: string;       // VD: "8931234567891"
  stock?: number;         // Tồn kho riêng vị này
  priceAdjustment?: number;
}

export interface ProductVariantCombination {
  id: string;
  sizeOptionId: string;
  flavorOptionId: string;
  priceAdjustment?: number;
  sku?: string;
  barcode?: string;
  stock?: number;
  isAvailable?: boolean;
}

export interface ProductNutrition {
  basis: "per_100g" | "per_serving";
  servingSize?: string;
  caloriesKcal?: number;
  proteinG?: number;
  carbohydratesG?: number;
  sugarG?: number;
  fatG?: number;
  saturatedFatG?: number;
  sodiumMg?: number;
  source?: string;
  updatedAt?: string;
}

export interface ProductSocialMetadata {
  title?: string;
  description?: string;
  imageUrl?: string;
  hashtags?: string[];
}

export interface BranchStock {
  branchId: string;
  stock: number;
}

export interface ProductFeedMetrics {
  sales7d?: number;
  sales30d?: number;
  views30d?: number;
  addToCartRate?: number;
  conversionRate?: number;
  popularityScore?: number;
  updatedAt?: string;
}

export type ProductItemType = "finished_good" | "ingredient" | "semi_finished";
export type ProductLifecycleStatus = "active" | "inactive" | "draft";
export type ProductWorkspaceCardId =
  | "sales"
  | "production"
  | "finance"
  | "logistics"
  | "procurement"
  | "analytics";

export interface ProductWorkspaceCardConfig {
  description?: string;
  illustrationUrl?: string;
}

export interface ProductionStep {
  id: string;
  name: string;
  durationMinutes: number;
  workstation?: string;
  output?: string;
}

export interface Product {
  id: string;
  name: string;
  /** Internal catalog name used by operations and back office. */
  displayName?: string;
  /** Short copy for product cards and collection listings. */
  shortDescription?: string;
  /** Determines the inventory workspaces that are relevant to this catalog item. */
  itemType?: ProductItemType;
  /** Lifecycle is distinct from storefront availability. */
  lifecycleStatus?: ProductLifecycleStatus;
  /** Presentation metadata for cards in the admin product workspace. */
  workspaceCards?: Partial<Record<ProductWorkspaceCardId, ProductWorkspaceCardConfig>>;
  productionSteps?: ProductionStep[];
  /** Internal production lead-time. Kept separate from customer-facing preparation time. */
  manufacturingLeadMinutes?: number;
  manufacturingOutputQuantity?: number;
  manufacturingOutputUnit?: string;
  price: number; // Base price in VND
  imageUrl: string;
  categoryId?: string;
  description?: string;
  sellingPoints?: string[];
  servingSuggestion?: string;
  ingredients?: string[];
  shelfLife?: string;
  storage?: string;
  saleArea?: string[];
  ingredientsCost?: number;
  packagingCost?: number;
  laborCost?: number;
  overheadCost?: number;
  wastePercent?: number;
  targetGrossMarginPercent?: number;
  availableForDelivery?: boolean;
  availableForPickup?: boolean;
  sku?: string;          // Mã sản phẩm chính, VD: "BK-CAKE-001"
  barcode?: string;      // Mã vạch sản phẩm chính, VD: "8931234567890"
  stock?: number; // Tồn kho cho admin/inventory
  isAvailable?: boolean; // Trạng thái đang bán
  // Customization options
  sizeOptions?: SizeOption[];
  flavorOptions?: FlavorOption[];
  variantCombinations?: ProductVariantCombination[];
  requiresMessage?: boolean; // Allow custom message on cake
  // Search and merchandising metadata
  tags?: string[];
  occasionTags?: string[];
  dietaryTags?: string[];
  allergens?: string[];
  searchKeywords?: string[];
  galleryImages?: string[];
  nutrition?: ProductNutrition;
  social?: ProductSocialMetadata;
  pickupBranchIds?: string[];
  branchStock?: BranchStock[];
  preparationTimeMinutes?: number;
  availableStoreIds?: string[];
  dailyStock?: number;
  availableFrom?: string;
  availableUntil?: string;
  sweetnessLevel?: "low" | "medium" | "high";
  servingSize?: string;
  rankingBoost?: number;
  feedMetrics?: ProductFeedMetrics;
  requiresPreorder?: boolean;
  preorderMinHours?: number;
  availableToday?: boolean;
  sortPriority?: number;
  // Feature flags
  isFeatured?: boolean; // Hiển thị ở trang chủ
  isNew?: boolean; // Sản phẩm mới
  isBestseller?: boolean; // Bán chạy
  createdAt?: Date; // Ngày tạo
  updatedAt?: Date; // Ngày cập nhật
}
