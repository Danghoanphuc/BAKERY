import type {
  DealerTier,
  DealerType,
  InventoryBaseUnit,
  RecipeDirectLaborCostLine,
  RecipePackagingCostLine,
  RecipeWasteCalculation,
  WholesalePriceBreak,
} from "@/types";

export type WholesaleProductSource = "new" | "existing";

export type WholesaleBomInput = {
  yieldQuantity: number;
  ingredients: Array<{
    ingredientId: string;
    quantity: number;
    componentType?: "ingredient" | "semi_finished";
  }>;
  packagingCostPerBatch: number;
  directLaborCostPerBatch: number;
  overheadCostPerBatch: number;
  wasteBasisPoints: number;
  packagingCostLines?: RecipePackagingCostLine[];
  directLaborCostLines?: RecipeDirectLaborCostLine[];
  wasteCalculation?: RecipeWasteCalculation;
};

export type WholesaleFinishedProductInput = {
  source: WholesaleProductSource;
  productId?: string;
  product: {
    name: string;
    categoryId?: string;
    sku?: string;
    barcode?: string;
    baseUnit: InventoryBaseUnit;
    imageUrl?: string;
    shelfLife?: string;
    storage?: string;
  };
  offer: {
    wholesalePrice: number;
    minimumOrderQuantity: number;
    orderIncrement: number;
    sellUnitLabel: string;
    unitsPerSellUnit: number;
    sellUnitSku?: string;
    sellUnitBarcode?: string;
    locationId: string;
    leadTimeHours: number;
    isAvailable: boolean;
    priceBreaks: WholesalePriceBreak[];
    tierDiscounts?: Partial<Record<Exclude<DealerTier, "regular">, number>>;
    eligibleDealerTypes: DealerType[];
    eligibleDealerTiers: DealerTier[];
    deliveryAreas: string[];
  };
  bom?: WholesaleBomInput;
};

export type WholesaleOfferValidationResult =
  | { ok: true; value: WholesaleFinishedProductInput }
  | { ok: false; error: string };

const BASE_UNITS = new Set<InventoryBaseUnit>(["gram", "millilitre", "each"]);
const DEALER_TYPES = new Set<DealerType>(["retail", "restaurant", "cafe", "other"]);
const DEALER_TIERS = new Set<DealerTier>(["regular", "silver", "gold", "platinum"]);

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function positiveInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(text).filter(Boolean))];
}

function enumList<T extends string>(value: unknown, allowed: ReadonlySet<T>) {
  return stringList(value).filter((item): item is T => allowed.has(item as T));
}

function normalizePriceBreaks(value: unknown): WholesalePriceBreak[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = item && typeof item === "object"
        ? item as Record<string, unknown>
        : {};
      return {
        minQuantity: positiveInteger(record.minQuantity),
        unitPrice: positiveInteger(record.unitPrice),
      };
    })
    .filter((item) => item.minQuantity > 0 && item.unitPrice > 0)
    .sort((left, right) => left.minQuantity - right.minQuantity);
}

function normalizeTierDiscounts(value: unknown) {
  const record = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const result: Partial<Record<Exclude<DealerTier, "regular">, number>> = {};
  (["silver", "gold", "platinum"] as const).forEach((tier) => {
    const discount = nonNegativeInteger(record[tier]);
    if (discount > 0) result[tier] = Math.min(100, discount);
  });
  return result;
}

function normalizeBom(value: unknown): WholesaleBomInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const rawIngredients = Array.isArray(record.ingredients)
    ? record.ingredients
    : [];
  const packagingCostLines = Array.isArray(record.packagingCostLines)
    ? record.packagingCostLines.map((item) => {
        const line = item && typeof item === "object"
          ? item as Record<string, unknown>
          : {};
        return {
          id: text(line.id),
          name: text(line.name),
          quantity: Number(line.quantity ?? 0),
          unitCost: nonNegativeInteger(line.unitCost),
        };
      })
    : undefined;
  const directLaborCostLines = Array.isArray(record.directLaborCostLines)
    ? record.directLaborCostLines.map((item) => {
        const line = item && typeof item === "object"
          ? item as Record<string, unknown>
          : {};
        return {
          id: text(line.id),
          role: text(line.role),
          people: Number(line.people ?? 0),
          minutes: Number(line.minutes ?? 0),
          hourlyRate: nonNegativeInteger(line.hourlyRate),
        };
      })
    : undefined;
  const rawWasteCalculation = record.wasteCalculation &&
    typeof record.wasteCalculation === "object"
    ? record.wasteCalculation as Record<string, unknown>
    : undefined;
  return {
    yieldQuantity: positiveInteger(record.yieldQuantity),
    ingredients: rawIngredients.map((item) => {
      const line = item && typeof item === "object"
        ? item as Record<string, unknown>
        : {};
      return {
        ingredientId: text(line.ingredientId),
        quantity: positiveInteger(line.quantity),
        componentType:
          line.componentType === "semi_finished"
            ? "semi_finished"
            : "ingredient",
      };
    }),
    packagingCostPerBatch: nonNegativeInteger(record.packagingCostPerBatch),
    directLaborCostPerBatch: nonNegativeInteger(record.directLaborCostPerBatch),
    overheadCostPerBatch: nonNegativeInteger(record.overheadCostPerBatch),
    wasteBasisPoints: nonNegativeInteger(record.wasteBasisPoints),
    ...(packagingCostLines ? { packagingCostLines } : {}),
    ...(directLaborCostLines ? { directLaborCostLines } : {}),
    ...(rawWasteCalculation ? {
      wasteCalculation: {
        plannedQuantity: Number(rawWasteCalculation.plannedQuantity ?? 0),
        goodQuantity: Number(rawWasteCalculation.goodQuantity ?? 0),
      },
    } : {}),
  };
}

export function normalizeWholesaleFinishedProductInput(
  input: unknown,
): WholesaleFinishedProductInput {
  const root = input && typeof input === "object"
    ? input as Record<string, unknown>
    : {};
  const rawProduct = root.product && typeof root.product === "object"
    ? root.product as Record<string, unknown>
    : {};
  const rawOffer = root.offer && typeof root.offer === "object"
    ? root.offer as Record<string, unknown>
    : {};
  const source: WholesaleProductSource = root.source === "existing"
    ? "existing"
    : "new";
  const baseUnit = BASE_UNITS.has(rawProduct.baseUnit as InventoryBaseUnit)
    ? rawProduct.baseUnit as InventoryBaseUnit
    : "each";

  return {
    source,
    productId: text(root.productId) || undefined,
    product: {
      name: text(rawProduct.name),
      categoryId: text(rawProduct.categoryId) || undefined,
      sku: text(rawProduct.sku) || undefined,
      barcode: text(rawProduct.barcode) || undefined,
      baseUnit,
      imageUrl: text(rawProduct.imageUrl) || undefined,
      shelfLife: text(rawProduct.shelfLife) || undefined,
      storage: text(rawProduct.storage) || undefined,
    },
    offer: {
      wholesalePrice: nonNegativeInteger(rawOffer.wholesalePrice),
      minimumOrderQuantity: positiveInteger(rawOffer.minimumOrderQuantity, 1),
      orderIncrement: positiveInteger(rawOffer.orderIncrement, 1),
      sellUnitLabel: text(rawOffer.sellUnitLabel),
      unitsPerSellUnit: positiveInteger(rawOffer.unitsPerSellUnit, 1),
      sellUnitSku: text(rawOffer.sellUnitSku) || undefined,
      sellUnitBarcode: text(rawOffer.sellUnitBarcode) || undefined,
      locationId: text(rawOffer.locationId) || "main",
      leadTimeHours: nonNegativeInteger(rawOffer.leadTimeHours),
      isAvailable: rawOffer.isAvailable === true,
      priceBreaks: normalizePriceBreaks(rawOffer.priceBreaks),
      tierDiscounts: normalizeTierDiscounts(rawOffer.tierDiscounts),
      eligibleDealerTypes: enumList(rawOffer.eligibleDealerTypes, DEALER_TYPES),
      eligibleDealerTiers: enumList(rawOffer.eligibleDealerTiers, DEALER_TIERS),
      deliveryAreas: stringList(rawOffer.deliveryAreas),
    },
    bom: normalizeBom(root.bom),
  };
}

export function validateWholesaleFinishedProductInput(
  input: unknown,
): WholesaleOfferValidationResult {
  const value = normalizeWholesaleFinishedProductInput(input);
  if (value.source === "existing" && !value.productId) {
    return { ok: false, error: "Vui lòng chọn thành phẩm nguồn." };
  }
  if (value.source === "new" && !value.product.name) {
    return { ok: false, error: "Vui lòng nhập tên thành phẩm nội bộ." };
  }
  if (value.bom) {
    if (value.bom.yieldQuantity <= 0) {
      return { ok: false, error: "Sản lượng của một mẻ phải lớn hơn 0." };
    }
    if (value.bom.ingredients.length === 0 ||
        value.bom.ingredients.some((line) => !line.ingredientId || line.quantity <= 0)) {
      return {
        ok: false,
        error: "BOM cần ít nhất một thành phần với định lượng hợp lệ.",
      };
    }
    const ingredientIds = value.bom.ingredients.map((line) => line.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      return { ok: false, error: "Mỗi thành phần chỉ nên xuất hiện một lần trong BOM." };
    }
    if (value.bom.wasteBasisPoints > 10_000) {
      return { ok: false, error: "Hao hụt BOM không được vượt quá 100%." };
    }
  }
  if (!value.offer.sellUnitLabel) {
    return { ok: false, error: "Vui lòng nhập tên quy cách bán sỉ." };
  }
  if (value.offer.unitsPerSellUnit <= 0) {
    return { ok: false, error: "Số sản phẩm trong một quy cách phải lớn hơn 0." };
  }
  if (value.offer.minimumOrderQuantity % value.offer.orderIncrement !== 0) {
    return {
      ok: false,
      error: "Số lượng tối thiểu phải là bội số của bước đặt hàng.",
    };
  }
  const duplicateBreak = value.offer.priceBreaks.some(
    (item, index, all) =>
      index > 0 && item.minQuantity === all[index - 1].minQuantity,
  );
  if (duplicateBreak) {
    return { ok: false, error: "Mỗi bậc giá cần một mốc số lượng khác nhau." };
  }
  const invalidBreak = value.offer.priceBreaks.some(
    (item) =>
      item.minQuantity < value.offer.minimumOrderQuantity ||
      item.minQuantity % value.offer.orderIncrement !== 0 ||
      (value.offer.wholesalePrice > 0 && item.unitPrice >= value.offer.wholesalePrice),
  );
  if (invalidBreak) {
    return {
      ok: false,
      error: "Bậc giá phải theo đúng bước đặt, không thấp hơn MOQ và có giá tốt hơn giá cơ sở.",
    };
  }
  if (value.offer.isAvailable && value.offer.wholesalePrice <= 0) {
    return {
      ok: false,
      error: "Cần nhập giá sỉ trước khi kích hoạt mở bán.",
    };
  }
  return { ok: true, value };
}

export function getWholesaleUnitPrice(
  wholesalePrice: number,
  priceBreaks: WholesalePriceBreak[],
  quantity: number,
) {
  return priceBreaks.reduce(
    (price, item) => quantity >= item.minQuantity ? item.unitPrice : price,
    wholesalePrice,
  );
}
