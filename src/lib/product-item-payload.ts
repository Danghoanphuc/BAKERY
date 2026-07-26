import type {
  InventoryBaseUnit,
  Product,
  ProductItemType,
  ProductLifecycleStatus,
} from "@/types";

const ITEM_TYPES: ProductItemType[] = [
  "finished_good",
  "ingredient",
  "semi_finished",
];
const LIFECYCLE_STATUSES: ProductLifecycleStatus[] = [
  "active",
  "inactive",
  "draft",
];
const BASE_UNITS: InventoryBaseUnit[] = ["gram", "millilitre", "each"];

type ProductInput = Partial<Product> & Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function itemType(value: unknown): ProductItemType {
  return ITEM_TYPES.includes(value as ProductItemType)
    ? (value as ProductItemType)
    : "finished_good";
}

function lifecycleStatus(value: unknown): ProductLifecycleStatus {
  return LIFECYCLE_STATUSES.includes(value as ProductLifecycleStatus)
    ? (value as ProductLifecycleStatus)
    : "active";
}

function common(input: ProductInput, type: ProductItemType) {
  return {
    name: text(input.name),
    displayName: text(input.displayName) || text(input.name),
    itemType: type,
    lifecycleStatus: lifecycleStatus(input.lifecycleStatus),
    sku: text(input.sku),
    barcode: text(input.barcode),
    stock: Math.max(0, number(input.stock)),
    shelfLife: text(input.shelfLife),
    storage: text(input.storage),
  };
}

export function normalizeProductItemInput(input: ProductInput) {
  const type = itemType(input.itemType);
  const base = common(input, type);

  if (type === "ingredient") {
    const unit = BASE_UNITS.includes(input.baseUnit as InventoryBaseUnit)
      ? (input.baseUnit as InventoryBaseUnit)
      : "gram";

    return {
      ...base,
      itemType: "ingredient" as const,
      ingredientGroup: text(input.ingredientGroup),
      ingredientGroupId: text(input.ingredientGroupId),
      ingredientSubgroupId: text(input.ingredientSubgroupId),
      baseUnit: unit,
      purchaseUnit: text(input.purchaseUnit) || unit,
      purchasePackQuantity: Math.max(0, number(input.purchasePackQuantity, 1)),
      referencePurchasePrice: Math.max(0, number(input.referencePurchasePrice)),
      minimumStock: Math.max(0, number(input.minimumStock)),
      preferredSupplier: text(input.preferredSupplier),
      price: 0,
      imageUrl: text(input.imageUrl),
      isAvailable: false,
      availableForDelivery: false,
      availableForPickup: false,
      sizeOptions: [],
      flavorOptions: [],
      variantCombinations: [],
    };
  }

  if (type === "semi_finished") {
    const unit = BASE_UNITS.includes(input.baseUnit as InventoryBaseUnit)
      ? (input.baseUnit as InventoryBaseUnit)
      : "gram";
    return {
      ...base,
      itemType: "semi_finished" as const,
      baseUnit: unit,
      manufacturingLeadMinutes: Math.max(
        0,
        number(input.manufacturingLeadMinutes),
      ),
      manufacturingOutputQuantity: Math.max(
        0,
        number(input.manufacturingOutputQuantity, 1),
      ),
      manufacturingOutputUnit:
        text(input.manufacturingOutputUnit) || inventoryUnitLabel(unit),
      productionSteps: Array.isArray(input.productionSteps)
        ? input.productionSteps
        : [],
      ingredientsCost: Math.max(0, number(input.ingredientsCost)),
      packagingCost: Math.max(0, number(input.packagingCost)),
      laborCost: Math.max(0, number(input.laborCost)),
      overheadCost: Math.max(0, number(input.overheadCost)),
      wastePercent: Math.max(0, number(input.wastePercent)),
      price: 0,
      imageUrl: text(input.imageUrl),
      isAvailable: false,
      availableForDelivery: false,
      availableForPickup: false,
      sizeOptions: [],
      flavorOptions: [],
      variantCombinations: [],
    };
  }

  return {
    ...input,
    ...base,
    itemType: "finished_good" as const,
    price: Math.max(0, number(input.price)),
    imageUrl: text(input.imageUrl),
    categoryId: text(input.categoryId),
    isAvailable:
      base.lifecycleStatus === "active"
        ? boolean(input.isAvailable, true)
        : false,
  };
}

export function prepareProductItemForCreate(input: ProductInput) {
  const normalized = normalizeProductItemInput(input);
  if (normalized.itemType !== "semi_finished") return normalized;
  return {
    ...normalized,
    lifecycleStatus: "draft" as const,
    stock: 0,
  };
}

export function getSemiFinishedActivationError(
  input: ReturnType<typeof normalizeProductItemInput>,
  hasActiveRecipe: boolean,
) {
  if (
    input.itemType === "semi_finished" &&
    input.lifecycleStatus === "active" &&
    !hasActiveRecipe
  ) {
    return "Bán thành phẩm cần có BOM đang hoạt động trước khi chuyển sang trạng thái hoạt động.";
  }
  return null;
}

export function getProductItemValidationError(
  input: ReturnType<typeof normalizeProductItemInput>,
) {
  if (!input.name) return "Vui lòng nhập tên nội bộ.";

  if (input.itemType === "ingredient") {
    if (!input.ingredientGroupId && !input.ingredientGroup) {
      return "Vui lòng chọn nhóm nguyên liệu.";
    }
    if (input.purchasePackQuantity <= 0) {
      return "Quy cách mua phải lớn hơn 0.";
    }
    return null;
  }

  if (input.itemType === "semi_finished") {
    if (input.manufacturingOutputQuantity <= 0) {
      return "Sản lượng mỗi mẻ phải lớn hơn 0.";
    }
    if (!input.manufacturingOutputUnit) {
      return "Vui lòng nhập đơn vị đầu ra.";
    }
    return null;
  }

  if (!input.displayName) return "Vui lòng nhập tên hiển thị.";
  if (!input.categoryId) return "Vui lòng chọn danh mục bán hàng.";
  if (!input.imageUrl) return "Vui lòng tải lên ít nhất một ảnh sản phẩm.";
  if (input.price <= 0) return "Giá niêm yết phải lớn hơn 0.";
  return null;
}

function inventoryUnitLabel(unit: InventoryBaseUnit) {
  if (unit === "millilitre") return "ml";
  if (unit === "each") return "cái";
  return "g";
}
