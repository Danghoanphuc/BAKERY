import { NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";
import {
  getSalesRouteRun,
  transitionSalesRouteRun,
} from "@/features/wholesale-routes";
import { routeApiError } from "@/features/wholesale-routes/api";
import type { SalesRouteRunStatus } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const run = await getSalesRouteRun(
      (await params).runId,
      getAdminSession(request)!,
    );
    if (!run) return NextResponse.json({ error: "Không tìm thấy chuyến đi." }, { status: 404 });
    return NextResponse.json({ run });
  } catch (error) {
    return routeApiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const parsed = await request.json().catch(() => null);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
    }
    const body = parsed as { status?: SalesRouteRunStatus };
    if (!body.status || !["published", "in_progress", "completed", "cancelled"].includes(body.status)) {
      return NextResponse.json({ error: "Trạng thái chuyến không hợp lệ." }, { status: 400 });
    }
    const run = await transitionSalesRouteRun(
      (await params).runId,
      body.status,
      getAdminSession(request)!,
    );
    return NextResponse.json({ run });
  } catch (error) {
    return routeApiError(error);
  }
}
