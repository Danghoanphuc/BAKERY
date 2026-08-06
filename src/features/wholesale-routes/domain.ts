import type {
  SalesRouteRunStatus,
  SalesRouteStopStatus,
  SalesRouteVisitOutcome,
} from "@/types";

const RUN_TRANSITIONS: Record<SalesRouteRunStatus, readonly SalesRouteRunStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const STOP_TRANSITIONS: Record<SalesRouteStopStatus, readonly SalesRouteStopStatus[]> = {
  pending: ["arrived", "skipped"],
  arrived: ["completed", "skipped"],
  completed: [],
  skipped: [],
};

export function canTransitionSalesRouteRun(
  from: SalesRouteRunStatus,
  to: SalesRouteRunStatus,
) {
  return RUN_TRANSITIONS[from].includes(to);
}

export function canTransitionSalesRouteStop(
  from: SalesRouteStopStatus,
  to: SalesRouteStopStatus,
) {
  return STOP_TRANSITIONS[from].includes(to);
}

export function isSalesRouteVisitOutcome(
  value: unknown,
): value is SalesRouteVisitOutcome {
  return [
    "ordered",
    "no_order",
    "not_met",
    "follow_up",
    "closed",
  ].includes(String(value));
}

export function isBusinessDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

export function normalizeRouteScheduleDays(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
  )].sort((a, b) => a - b);
}

export function summarizeRouteStops(
  stops: Array<{ status: SalesRouteStopStatus; outcome?: SalesRouteVisitOutcome }>,
) {
  return stops.reduce(
    (summary, stop) => {
      if (stop.status === "completed") summary.completedStops += 1;
      if (stop.status === "skipped") summary.skippedStops += 1;
      if (stop.outcome === "ordered") summary.orderedStops += 1;
      return summary;
    },
    { completedStops: 0, skippedStops: 0, orderedStops: 0 },
  );
}
