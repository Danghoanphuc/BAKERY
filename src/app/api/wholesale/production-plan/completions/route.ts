import { NextResponse } from "next/server";
import { completeProductionPlan } from "@/features/wholesale-production-plan";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const session = getAdminSession(request);
    const completion = await completeProductionPlan({
      ...body,
      occurredAt: new Date(body.occurredAt),
      actor: session?.id ?? "admin",
    });
    return NextResponse.json(completion, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalid = message === "INVALID_PRODUCTION_PLAN_COMPLETION";
    const insufficient = message.startsWith("INSUFFICIENT_INVENTORY:");
    const reusedKey = message === "IDEMPOTENCY_KEY_REUSED";
    return NextResponse.json(
      {
        error: invalid
          ? "Dữ liệu xác nhận sản xuất chưa hợp lệ."
          : insufficient
            ? message
            : reusedKey
              ? "Khóa chống trùng đã được dùng cho một lần hoàn tất khác."
            : "Không thể hoàn tất kế hoạch sản xuất.",
      },
      { status: invalid ? 400 : insufficient || reusedKey ? 409 : 500 },
    );
  }
}
