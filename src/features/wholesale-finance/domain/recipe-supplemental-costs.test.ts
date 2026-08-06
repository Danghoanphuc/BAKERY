import { describe, expect, it } from "vitest";
import {
  calculateDirectLaborCost,
  calculatePackagingCost,
  calculateWasteBasisPoints,
} from "./recipe-supplemental-costs";

describe("recipe supplemental costs", () => {
  it("totals packaging lines using quantity and unit cost", () => {
    expect(
      calculatePackagingCost([
        { id: "box", name: "Hộp", quantity: 10, unitCost: 2_500 },
        { id: "label", name: "Tem", quantity: 10, unitCost: 500 },
      ]),
    ).toBe(30_000);
  });

  it("totals direct labor lines using people, minutes and hourly rate", () => {
    expect(
      calculateDirectLaborCost([
        {
          id: "baker",
          role: "Thợ chính",
          people: 2,
          minutes: 90,
          hourlyRate: 40_000,
        },
      ]),
    ).toBe(120_000);
  });

  it("derives waste basis points from planned and good output", () => {
    expect(
      calculateWasteBasisPoints({
        plannedQuantity: 140,
        goodQuantity: 130,
      }),
    ).toBe(714);
  });
});
