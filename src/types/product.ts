export interface SizeOption {
  id: string;
  label: string; // e.g., "16cm", "20cm", "24cm"
  priceAdjustment: number; // Additional price (0 for base size, positive for larger)
  servings?: string;
  description?: string;
  imageUrl?: string;
  badge?: string;
}

export interface FlavorOption {
  id: string;
  label: string; // e.g., "Chocolate", "Vanilla", "Strawberry"
  description?: string;
  imageUrl?: string;
  badge?: string;
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

export interface Product {
  id: string;
  name: string;
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
  stock?: number; // Tồn kho cho admin/inventory
  isAvailable?: boolean; // Trạng thái đang bán
  // Customization options
  sizeOptions?: SizeOption[];
  flavorOptions?: FlavorOption[];
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
