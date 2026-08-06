import { describe, expect, it } from "vitest";
import type { FinanceIngredient } from "@/types";
import {
  calculateWholesaleCostPreview,
  createEmptyWholesaleFinishedProductComposer,
  getWholesaleFinishedProductComposerError,
  wholesaleFinishedProductComposerToPayload,
} from "./wholesale-finished-product-composer";

const flour = {
  id: "flour",
  code: "NL-FLOUR",
  name: "Bột mì",
  baseUnit: "gram",
  costPerBaseUnitMicros: 25_000_000,
  isActive: true,
} satisfies FinanceIngredient;

describe("wholesale finished product composer", () => {
  it("maps the small form to a product, offer and BOM", () => {
    const form = {
      ...createEmptyWholesaleFinishedProductComposer(),
      name: "Croissant bơ",
      sku: "TP-CROISSANT",
      wholesalePrice: 180_000,
      sellUnitLabel: "Khay 6",
      unitsPerSellUnit: 6,
      yieldQuantity: 24,
      bomLines: [{ id: "line-1", ingredientId: "flour", quantity: 1_000 }],
    };

    expect(getWholesaleFinishedProductComposerError(form)).toBeNull();
    expect(wholesaleFinishedProductComposerToPayload(form)).toMatchObject({
      product: {
        name: "Croissant bơ",
        sku: "TP-CROISSANT",
        baseUnit: "each",
      },
      offer: {
        wholesalePrice: 180_000,
        sellUnitLabel: "Khay 6",
        unitsPerSellUnit: 6,
      },
      bom: {
        yieldQuantity: 24,
        ingredients: [{ ingredientId: "flour", quantity: 1_000 }],
      },
    });
  });

  it("derives unit cost from BOM, yield and supplemental costs", () => {
    const form = {
      ...createEmptyWholesaleFinishedProductComposer(),
      yieldQuantity: 10,
      bomLines: [{ id: "line-1", ingredientId: "flour", quantity: 1_000 }],
      packagingCostPerBatch: 10_000,
      directLaborCostPerBatch: 20_000,
      overheadCostPerBatch: 5_000,
      wastePercent: 10,
    };

    expect(calculateWholesaleCostPreview(form, [flour])).toEqual({
      ingredientCost: 2_500,
      packagingCost: 1_000,
      directLaborCost: 2_000,
      overheadCost: 500,
      wasteCost: 600,
      totalCost: 6_600,
    });
  });

  it("preserves a semi-finished component in the BOM payload", () => {
    const form = {
      ...createEmptyWholesaleFinishedProductComposer(),
      bomLines: [{
        id: "line-sauce",
        ingredientId: "sauce",
        componentType: "semi_finished" as const,
        quantity: 20,
      }],
    };

    expect(wholesaleFinishedProductComposerToPayload(form).bom?.ingredients)
      .toEqual([{
        ingredientId: "sauce",
        componentType: "semi_finished",
        quantity: 20,
      }]);
  });

  it("preserves the detailed supplemental-cost audit data", () => {
    const form = {
      ...createEmptyWholesaleFinishedProductComposer(),
      packagingCostPerBatch: 3_000,
      directLaborCostPerBatch: 40_000,
      wastePercent: 10,
      packagingCostLines: [{
        id: "box", name: "Hộp giấy", quantity: 3, unitCost: 1_000,
      }],
      directLaborCostLines: [{
        id: "baker", role: "Thợ bánh", people: 2, minutes: 60,
        hourlyRate: 20_000,
      }],
      wasteCalculation: { plannedQuantity: 10, goodQuantity: 9 },
    };

    expect(wholesaleFinishedProductComposerToPayload(form).bom).toMatchObject({
      packagingCostLines: [{ name: "Hộp giấy" }],
      directLaborCostLines: [{ role: "Thợ bánh" }],
      wasteCalculation: { plannedQuantity: 10, goodQuantity: 9 },
    });
  });

  it("requires a valid BOM line", () => {
    const form = {
      ...createEmptyWholesaleFinishedProductComposer(),
      name: "Croissant bơ",
      wholesalePrice: 180_000,
      sellUnitLabel: "Khay 6",
    };

    expect(getWholesaleFinishedProductComposerError(form)).toContain("BOM");
  });
});
