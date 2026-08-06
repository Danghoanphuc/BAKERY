import { NextResponse } from "next/server";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";
import { createSalesRouteOrder } from "@/features/wholesale-routes";
import { routeApiError } from "@/features/wholesale-routes/api";
import type { WholesaleRouteOrderLineInput } from "@/types";

export async function POST(
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
    const body = parsed as {
      stopId?: string;
      lines?: WholesaleRouteOrderLineInput[];
      idempotencyKey?: string;
      note?: string;
    };
    const rawLines: unknown[] = Array.isArray(body.lines) ? body.lines : [];
    const lines = rawLines.flatMap((value): WholesaleRouteOrderLineInput[] => {
      if (!value || typeof value !== "object") return [];
      const line = value as Record<string, unknown>;
      const wholesaleProductId =
        typeof line.wholesaleProductId === "string"
          ? line.wholesaleProductId.trim()
          : "";
      const quantity = Number(line.quantity);
      if (
        !wholesaleProductId ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        quantity > 100_000
      ) {
        return [];
      }
      return [{ wholesaleProductId, quantity }];
    });
    if (
      typeof body.stopId !== "string" ||
      !body.stopId ||
      typeof body.idempotencyKey !== "string" ||
      !/^[a-zA-Z0-9_-]{16,80}$/.test(body.idempotencyKey) ||
      !lines.length ||
      lines.length !== rawLines.length ||
      lines.length > 100
    ) {
      return NextResponse.json(
        { error: "Điểm ghé, sản phẩm và khóa chống trùng là bắt buộc." },
        { status: 400 },
      );
    }
    const order = await createSalesRouteOrder({
      runId: (await params).runId,
      stopId: body.stopId,
      lines,
      idempotencyKey: body.idempotencyKey,
      note: typeof body.note === "string" ? body.note.slice(0, 2_000) : undefined,
      principal: getAdminSession(request)!,
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return routeApiError(error);
  }
}
