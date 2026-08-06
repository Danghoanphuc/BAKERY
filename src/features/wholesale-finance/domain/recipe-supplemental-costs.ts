import type {
  RecipeDirectLaborCostLine,
  RecipePackagingCostLine,
  RecipeWasteCalculation,
} from "@/types";

export function calculatePackagingLineCost(line: RecipePackagingCostLine) {
  if (!Number.isFinite(line.quantity) || !Number.isFinite(line.unitCost)) {
    return 0;
  }
  return Math.round(Math.max(0, line.quantity) * Math.max(0, line.unitCost));
}

export function calculatePackagingCost(
  lines: RecipePackagingCostLine[],
) {
  return lines.reduce(
    (sum, line) => sum + calculatePackagingLineCost(line),
    0,
  );
}

export function calculateDirectLaborLineCost(
  line: RecipeDirectLaborCostLine,
) {
  if (
    !Number.isFinite(line.people) ||
    !Number.isFinite(line.minutes) ||
    !Number.isFinite(line.hourlyRate)
  ) {
    return 0;
  }
  return Math.round(
    (Math.max(0, line.people) *
      Math.max(0, line.minutes) *
      Math.max(0, line.hourlyRate)) /
      60,
  );
}

export function calculateDirectLaborCost(
  lines: RecipeDirectLaborCostLine[],
) {
  return lines.reduce(
    (sum, line) => sum + calculateDirectLaborLineCost(line),
    0,
  );
}

export function calculateWasteBasisPoints(
  calculation: RecipeWasteCalculation,
) {
  if (
    !Number.isFinite(calculation.plannedQuantity) ||
    calculation.plannedQuantity <= 0 ||
    !Number.isFinite(calculation.goodQuantity) ||
    calculation.goodQuantity < 0 ||
    calculation.goodQuantity > calculation.plannedQuantity
  ) {
    return 0;
  }
  return Math.round(
    ((calculation.plannedQuantity - calculation.goodQuantity) /
      calculation.plannedQuantity) *
      10_000,
  );
}
