import type { ManufacturingOverheadSettings } from "@/types";

export const EMPTY_MANUFACTURING_OVERHEAD_SETTINGS: ManufacturingOverheadSettings = {
  utilitiesPerMonth: 0,
  equipmentDepreciationPerMonth: 0,
  premisesPerMonth: 0,
  maintenancePerMonth: 0,
  otherIndirectCostsPerMonth: 0,
  productiveHoursPerMonth: 0,
};

const MONEY_FIELDS: Array<keyof ManufacturingOverheadSettings> = [
  "utilitiesPerMonth",
  "equipmentDepreciationPerMonth",
  "premisesPerMonth",
  "maintenancePerMonth",
  "otherIndirectCostsPerMonth",
];

export function normalizeManufacturingOverheadSettings(
  input: Partial<ManufacturingOverheadSettings>,
): ManufacturingOverheadSettings {
  const normalized = {
    utilitiesPerMonth: Number(input.utilitiesPerMonth ?? 0),
    equipmentDepreciationPerMonth: Number(
      input.equipmentDepreciationPerMonth ?? 0,
    ),
    premisesPerMonth: Number(input.premisesPerMonth ?? 0),
    maintenancePerMonth: Number(input.maintenancePerMonth ?? 0),
    otherIndirectCostsPerMonth: Number(input.otherIndirectCostsPerMonth ?? 0),
    productiveHoursPerMonth: Number(input.productiveHoursPerMonth ?? 0),
  };

  if (
    MONEY_FIELDS.some(
      (field) =>
        !Number.isSafeInteger(normalized[field]) || normalized[field] < 0,
    ) ||
    !Number.isFinite(normalized.productiveHoursPerMonth) ||
    normalized.productiveHoursPerMonth <= 0 ||
    normalized.productiveHoursPerMonth > 10_000
  ) {
    throw new Error("INVALID_MANUFACTURING_OVERHEAD_SETTINGS");
  }

  return normalized;
}

export function calculateMonthlyManufacturingOverhead(
  settings: ManufacturingOverheadSettings,
) {
  return MONEY_FIELDS.reduce((sum, field) => sum + settings[field], 0);
}

export function calculateManufacturingOverheadRate(
  settings: ManufacturingOverheadSettings,
) {
  if (settings.productiveHoursPerMonth <= 0) return 0;
  return Math.round(
    calculateMonthlyManufacturingOverhead(settings) /
      settings.productiveHoursPerMonth,
  );
}

export function calculateOverheadForBatch(
  settings: ManufacturingOverheadSettings,
  batchMinutes: number,
) {
  if (!Number.isFinite(batchMinutes) || batchMinutes <= 0) return 0;
  return Math.round(
    (calculateManufacturingOverheadRate(settings) * batchMinutes) / 60,
  );
}
