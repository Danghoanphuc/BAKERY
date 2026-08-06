import { describe, expect, it } from "vitest";
import type { ProductionGroup } from "@/types/production-plan";
import {
  calculateProductionPlan,
  inventoryPlanKey,
  normalizeProductionGroup,
} from "./production-plan";

const group: ProductionGroup = {
  id: "sweet-dough",
  name: "Thau bánh mì ngọt",
  batchLabel: "thau",
  batchCapacity: 5_000,
  batchUnit: "gram",
  inputLines: [
    { itemType: "ingredient", itemId: "flour", quantityPerBatch: 3_000 },
    { itemType: "product", itemId: "sauce", quantityPerBatch: 500 },
  ],
  outputLines: [
    { productId: "round", quantityPerUnit: 60, targetQuantity: 100 },
    { productId: "long", quantityPerUnit: 80, targetQuantity: 70 },
    { productId: "sauce-bread", quantityPerUnit: 65, targetQuantity: 50 },
  ],
};

describe("production plan", () => {
  it("turns today's stock into output quantities, batches and materials", () => {
    const result = calculateProductionPlan(
      group,
      { round: 20, long: 15, "sauce-bread": 5 },
      {
        [inventoryPlanKey("ingredient", "flour")]: 7_000,
        [inventoryPlanKey("product", "sauce")]: 2_000,
      },
    );

    expect(result.outputs.map((line) => line.plannedQuantity)).toEqual([80, 55, 45]);
    expect(result.totalRequiredBatchOutput).toBe(12_125);
    expect(result.batchCount).toBe(3);
    expect(result.surplusQuantity).toBe(2_875);
    expect(result.materials).toEqual([
      {
        itemType: "ingredient",
        itemId: "flour",
        requiredQuantity: 9_000,
        availableQuantity: 7_000,
        shortageQuantity: 2_000,
      },
      {
        itemType: "product",
        itemId: "sauce",
        requiredQuantity: 1_500,
        availableQuantity: 2_000,
        shortageQuantity: 0,
      },
    ]);
  });

  it("returns a zero plan when current stock already meets every target", () => {
    const result = calculateProductionPlan(group, {
      round: 100,
      long: 70,
      "sauce-bread": 50,
    });
    expect(result.batchCount).toBe(0);
    expect(result.totalRequiredBatchOutput).toBe(0);
    expect(result.materials.every((line) => line.requiredQuantity === 0)).toBe(true);
  });

  it("rejects duplicate or incomplete group configuration", () => {
    expect(() =>
      normalizeProductionGroup({
        ...group,
        inputLines: [group.inputLines[0], group.inputLines[0]],
      }),
    ).toThrow("INVALID_PRODUCTION_GROUP");
    expect(() =>
      normalizeProductionGroup({ ...group, outputLines: [] }),
    ).toThrow("INVALID_PRODUCTION_GROUP");
  });
});
