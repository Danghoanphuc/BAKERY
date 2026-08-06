import { NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";
import {
  isSalesRouteVisitOutcome,
  updateSalesRouteStop,
} from "@/features/wholesale-routes";
import { routeApiError } from "@/features/wholesale-routes/api";
import type {
  SalesRouteLocation,
  SalesRouteStopStatus,
} from "@/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ runId: string; stopId: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const parsed = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
    }
    const body = parsed as {
      status?: SalesRouteStopStatus;
      location?: Omit<SalesRouteLocation, "capturedAt">;
      locationExceptionReason?: string;
      outcome?: unknown;
      note?: string;
      skipReason?: string;
    };
    const locationExceptionReason =
      typeof body.locationExceptionReason === "string"
        ? body.locationExceptionReason.slice(0, 500)
        : undefined;
    const note = typeof body.note === "string" ? body.note.slice(0, 2_000) : undefined;
    const skipReason =
      typeof body.skipReason === "string" ? body.skipReason.slice(0, 500) : undefined;
    if (!body.status || !["arrived", "completed", "skipped"].includes(body.status)) {
      return NextResponse.json({ error: "Trạng thái điểm ghé không hợp lệ." }, { status: 400 });
    }
    if (body.outcome !== undefined && !isSalesRouteVisitOutcome(body.outcome)) {
      return NextResponse.json({ error: "Kết quả lượt ghé không hợp lệ." }, { status: 400 });
    }
    if (
      body.location &&
      (
        !Number.isFinite(body.location.lat) ||
        !Number.isFinite(body.location.lng) ||
        Math.abs(body.location.lat) > 90 ||
        Math.abs(body.location.lng) > 180
      )
    ) {
      return NextResponse.json({ error: "Tọa độ check-in không hợp lệ." }, { status: 400 });
    }
    const routeParams = await params;
    const run = await updateSalesRouteStop({
      runId: routeParams.runId,
      stopId: routeParams.stopId,
      status: body.status,
      principal: getAdminSession(request)!,
      location: body.location,
      locationExceptionReason,
      outcome: isSalesRouteVisitOutcome(body.outcome) ? body.outcome : undefined,
      note,
      skipReason,
    });
    return NextResponse.json({ run });
  } catch (error) {
    return routeApiError(error);
  }
}
