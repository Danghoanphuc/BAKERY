export interface SizeOption {
  id: string;
  label: string; // e.g., "16cm", "20cm", "24cm"
  priceAdjustment: number; // Additional price (0 for base size, positive for larger)
}

export interface FlavorOption {
  id: string;
  label: string; // e.g., "Chocolate", "Vanilla", "Strawberry"
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
  ingredients?: string[];
  shelfLife?: string;
  storage?: string;
  saleArea?: string[];
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
