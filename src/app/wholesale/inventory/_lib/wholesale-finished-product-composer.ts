import type {
  FinanceIngredient,
  RecipeDirectLaborCostLine,
  RecipePackagingCostLine,
  RecipeWasteCalculation,
} from "@/types";
import { calculateRecipeDraftStandardUnitCost } from "@/features/wholesale-finance/domain/standard-costing";
import type { WholesaleFinishedProductInput } from "@/lib/wholesale-product-offer";
import { validateWholesaleFinishedProductInput } from "@/lib/wholesale-product-offer";

export type WholesaleBomLineFormData = {
  id: string;
  ingredientId: string;
  quantity: number;
  componentType?: "ingredient" | "semi_finished";
};

export type WholesaleFinishedProductComposerData = {
  name: string;
  sku: string;
  wholesalePrice: number;
  sellUnitLabel: string;
  unitsPerSellUnit: number;
  yieldQuantity: number;
  bomLines: WholesaleBomLineFormData[];
  packagingCostPerBatch: number;
  directLaborCostPerBatch: number;
  overheadCostPerBatch: number;
  wastePercent: number;
  packagingCostLines: RecipePackagingCostLine[];
  directLaborCostLines: RecipeDirectLaborCostLine[];
  wasteCalculation?: RecipeWasteCalculation;
};

export type WholesaleCostPreview = {
  ingredientCost: number;
  packagingCost: number;
  directLaborCost: number;
  overheadCost: number;
  wasteCost: number;
  totalCost: number;
};

export function createEmptyWholesaleFinishedProductComposer():
WholesaleFinishedProductComposerData {
  return {
    name: "",
    sku: "",
    wholesalePrice: 0,
    sellUnitLabel: "",
    unitsPerSellUnit: 1,
    yieldQuantity: 1,
    bomLines: [{ id: "bom-line-1", ingredientId: "", quantity: 0 }],
    packagingCostPerBatch: 0,
    directLaborCostPerBatch: 0,
    overheadCostPerBatch: 0,
    wastePercent: 0,
    packagingCostLines: [],
    directLaborCostLines: [],
  };
}

export function wholesaleFinishedProductComposerToPayload(
  formData: WholesaleFinishedProductComposerData,
): WholesaleFinishedProductInput {
  return {
    source: "new",
    product: {
      name: formData.name,
      sku: formData.sku || undefined,
      baseUnit: "each",
    },
    offer: {
      wholesalePrice: formData.wholesalePrice,
      minimumOrderQuantity: 1,
      orderIncrement: 1,
      sellUnitLabel: formData.sellUnitLabel,
      unitsPerSellUnit: formData.unitsPerSellUnit,
      sellUnitSku: formData.sku || undefined,
      locationId: "main",
      leadTimeHours: 0,
      isAvailable: true,
      priceBreaks: [],
      eligibleDealerTypes: [],
      eligibleDealerTiers: [],
      deliveryAreas: [],
    },
    bom: {
      yieldQuantity: formData.yieldQuantity,
      ingredients: formData.bomLines.map((line) => ({
        ingredientId: line.ingredientId,
        quantity: line.quantity,
        componentType: line.componentType ?? "ingredient",
      })),
      packagingCostPerBatch: formData.packagingCostPerBatch,
      directLaborCostPerBatch: formData.directLaborCostPerBatch,
      overheadCostPerBatch: formData.overheadCostPerBatch,
      wasteBasisPoints: Math.round(formData.wastePercent * 100),
      ...(formData.packagingCostLines.length > 0
        ? { packagingCostLines: formData.packagingCostLines }
        : {}),
      ...(formData.directLaborCostLines.length > 0
        ? { directLaborCostLines: formData.directLaborCostLines }
        : {}),
      ...(formData.wasteCalculation
        ? { wasteCalculation: formData.wasteCalculation }
        : {}),
    },
  };
}

export function getWholesaleFinishedProductComposerError(
  formData: WholesaleFinishedProductComposerData,
) {
  const validation = validateWholesaleFinishedProductInput(
    wholesaleFinishedProductComposerToPayload(formData),
  );
  return validation.ok ? null : validation.error;
}

export function calculateWholesaleCostPreview(
  formData: WholesaleFinishedProductComposerData,
  ingredients: FinanceIngredient[],
): WholesaleCostPreview {
  try {
    const result = calculateRecipeDraftStandardUnitCost({
      yieldQuantity: Math.max(1, formData.yieldQuantity),
      ingredients: formData.bomLines.map(({ ingredientId, quantity, componentType }) => ({
        ingredientId,
        quantity,
        componentType,
      })),
      packagingCostPerBatch: formData.packagingCostPerBatch,
      directLaborCostPerBatch: formData.directLaborCostPerBatch,
      overheadCostPerBatch: formData.overheadCostPerBatch,
      wasteBasisPoints: Math.round(Math.max(0, formData.wastePercent) * 100),
    }, ingredients);
    return {
      ingredientCost: result.ingredientCost,
      packagingCost: result.packagingCost,
      directLaborCost: result.directLaborCost,
      overheadCost: result.overheadCost,
      wasteCost: result.wasteCost,
      totalCost: result.totalCost,
    };
  } catch {
    return {
      ingredientCost: 0,
      packagingCost: 0,
      directLaborCost: 0,
      overheadCost: 0,
      wasteCost: 0,
      totalCost: 0,
    };
  }
}
