import { describe, expect, it } from "vitest";
import {
  canTransitionSalesRouteRun,
  canTransitionSalesRouteStop,
  isBusinessDate,
  normalizeRouteScheduleDays,
  summarizeRouteStops,
} from "./domain";

describe("wholesale route domain", () => {
  it("allows only forward run transitions", () => {
    expect(canTransitionSalesRouteRun("draft", "published")).toBe(true);
    expect(canTransitionSalesRouteRun("published", "completed")).toBe(false);
    expect(canTransitionSalesRouteRun("completed", "in_progress")).toBe(false);
  });

  it("allows check-in before completion", () => {
    expect(canTransitionSalesRouteStop("pending", "arrived")).toBe(true);
    expect(canTransitionSalesRouteStop("pending", "completed")).toBe(false);
    expect(canTransitionSalesRouteStop("arrived", "completed")).toBe(true);
  });

  it("normalizes schedule days", () => {
    expect(normalizeRouteScheduleDays([4, 1, 4, 8, -1, "2"])).toEqual([1, 2, 4]);
  });

  it("validates calendar business dates", () => {
    expect(isBusinessDate("2026-07-29")).toBe(true);
    expect(isBusinessDate("2026-02-30")).toBe(false);
  });

  it("summarizes terminal stops", () => {
    expect(summarizeRouteStops([
      { status: "completed", outcome: "ordered" },
      { status: "completed", outcome: "no_order" },
      { status: "skipped" },
    ])).toEqual({ completedStops: 2, skippedStops: 1, orderedStops: 1 });
  });
});
