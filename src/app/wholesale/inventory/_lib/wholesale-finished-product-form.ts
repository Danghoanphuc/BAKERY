import type {
  DealerTier,
  DealerType,
  InventoryBaseUnit,
  Product,
  WholesalePriceBreak,
} from "@/types";
import type {
  WholesaleFinishedProductInput,
  WholesaleProductSource,
} from "@/lib/wholesale-product-offer";
import {
  validateWholesaleFinishedProductInput,
} from "@/lib/wholesale-product-offer";

export type WholesaleFinishedProductFormData = {
  source: WholesaleProductSource;
  productId: string;
  name: string;
  categoryId: string;
  sku: string;
  barcode: string;
  baseUnit: InventoryBaseUnit;
  imageUrl: string;
  shelfLife: string;
  storage: string;
  wholesalePrice: number;
  minimumOrderQuantity: number;
  orderIncrement: number;
  sellUnitLabel: string;
  unitsPerSellUnit: number;
  sellUnitSku: string;
  sellUnitBarcode: string;
  locationId: string;
  leadTimeHours: number;
  isAvailable: boolean;
  priceBreaks: WholesalePriceBreak[];
  tierDiscounts: Record<Exclude<DealerTier, "regular">, number>;
  eligibleDealerTypes: DealerType[];
  eligibleDealerTiers: DealerTier[];
  deliveryAreas: string;
};

export function createEmptyWholesaleFinishedProductForm():
WholesaleFinishedProductFormData {
  return {
    source: "new",
    productId: "",
    name: "",
    categoryId: "",
    sku: "",
    barcode: "",
    baseUnit: "each",
    imageUrl: "",
    shelfLife: "",
    storage: "",
    wholesalePrice: 0,
    minimumOrderQuantity: 1,
    orderIncrement: 1,
    sellUnitLabel: "",
    unitsPerSellUnit: 1,
    sellUnitSku: "",
    sellUnitBarcode: "",
    locationId: "main",
    leadTimeHours: 0,
    isAvailable: false,
    priceBreaks: [],
    tierDiscounts: {
      silver: 0,
      gold: 0,
      platinum: 0,
    },
    eligibleDealerTypes: [],
    eligibleDealerTiers: [],
    deliveryAreas: "",
  };
}

export function applyExistingProductToWholesaleForm(
  current: WholesaleFinishedProductFormData,
  product: Product | undefined,
): WholesaleFinishedProductFormData {
  if (!product) {
    return {
      ...current,
      productId: "",
      name: "",
      categoryId: "",
      sku: "",
      barcode: "",
      imageUrl: "",
      shelfLife: "",
      storage: "",
      baseUnit: "each",
    };
  }
  return {
    ...current,
    productId: product.id,
    name: product.name,
    categoryId: product.categoryId ?? "",
    sku: product.sku ?? "",
    barcode: product.barcode ?? "",
    imageUrl: product.imageUrl ?? "",
    shelfLife: product.shelfLife ?? "",
    storage: product.storage ?? "",
    baseUnit: product.baseUnit ?? "each",
  };
}

export function wholesaleFinishedProductFormToPayload(
  formData: WholesaleFinishedProductFormData,
): WholesaleFinishedProductInput {
  return {
    source: formData.source,
    productId: formData.source === "existing" ? formData.productId : undefined,
    product: {
      name: formData.name,
      categoryId: formData.categoryId || undefined,
      sku: formData.sku || undefined,
      barcode: formData.barcode || undefined,
      baseUnit: formData.baseUnit,
      imageUrl: formData.imageUrl || undefined,
      shelfLife: formData.shelfLife || undefined,
      storage: formData.storage || undefined,
    },
    offer: {
      wholesalePrice: formData.wholesalePrice,
      minimumOrderQuantity: formData.minimumOrderQuantity,
      orderIncrement: formData.orderIncrement,
      sellUnitLabel: formData.sellUnitLabel,
      unitsPerSellUnit: formData.unitsPerSellUnit,
      sellUnitSku: formData.sellUnitSku || undefined,
      sellUnitBarcode: formData.sellUnitBarcode || undefined,
      locationId: formData.locationId,
      leadTimeHours: formData.leadTimeHours,
      isAvailable: formData.isAvailable,
      priceBreaks: formData.priceBreaks,
      tierDiscounts: formData.tierDiscounts,
      eligibleDealerTypes: formData.eligibleDealerTypes,
      eligibleDealerTiers: formData.eligibleDealerTiers,
      deliveryAreas: formData.deliveryAreas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    },
  };
}

export function getWholesaleFinishedProductFormError(
  formData: WholesaleFinishedProductFormData,
) {
  const validation = validateWholesaleFinishedProductInput(
    wholesaleFinishedProductFormToPayload(formData),
  );
  return validation.ok ? null : validation.error;
}
