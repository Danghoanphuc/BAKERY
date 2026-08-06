import { NextResponse } from "next/server";
import {
  listProductionGroups,
  saveProductionGroup,
} from "@/features/wholesale-production-plan";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await listProductionGroups());
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(
      await saveProductionGroup(await request.json()),
      { status: 201 },
    );
  } catch (error) {
    const invalid =
      error instanceof Error && error.message === "INVALID_PRODUCTION_GROUP";
    return NextResponse.json(
      {
        error: invalid
          ? "Cấu hình nhóm sản xuất chưa đầy đủ."
          : "Không thể lưu nhóm sản xuất.",
      },
      { status: invalid ? 400 : 500 },
    );
  }
}
