import { NextResponse } from "next/server";
import { getStandardCostCatalog } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const catalog = await getStandardCostCatalog();
  return NextResponse.json(catalog.ingredients);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(
    {
      error:
        "Hãy tạo nguyên liệu từ Kho/Sản phẩm để hồ sơ kho và giá vốn được đồng bộ.",
      createPath: "/admin/inventory/new/ingredient",
    },
    { status: 409 },
  );
}

