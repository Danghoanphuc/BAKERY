import { describe, expect, it } from "vitest";
import {
  calculateManufacturingOverheadRate,
  calculateMonthlyManufacturingOverhead,
  calculateOverheadForBatch,
  normalizeManufacturingOverheadSettings,
} from "./manufacturing-overhead";

const settings = {
  utilitiesPerMonth: 6_000_000,
  equipmentDepreciationPerMonth: 4_000_000,
  premisesPerMonth: 5_000_000,
  maintenancePerMonth: 2_000_000,
  otherIndirectCostsPerMonth: 1_000_000,
  productiveHoursPerMonth: 180,
};

describe("manufacturing overhead", () => {
  it("derives a transparent hourly rate and batch allocation", () => {
    expect(calculateMonthlyManufacturingOverhead(settings)).toBe(18_000_000);
    expect(calculateManufacturingOverheadRate(settings)).toBe(100_000);
    expect(calculateOverheadForBatch(settings, 90)).toBe(150_000);
  });

  it("rejects invalid money and productive-hour inputs", () => {
    expect(() =>
      normalizeManufacturingOverheadSettings({
        ...settings,
        utilitiesPerMonth: -1,
      }),
    ).toThrow("INVALID_MANUFACTURING_OVERHEAD_SETTINGS");
    expect(() =>
      normalizeManufacturingOverheadSettings({
        ...settings,
        productiveHoursPerMonth: 0,
      }),
    ).toThrow("INVALID_MANUFACTURING_OVERHEAD_SETTINGS");
  });
});
