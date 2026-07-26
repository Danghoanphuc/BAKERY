import { NextResponse } from "next/server";
import { getIngredient } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const ingredient = await getIngredient((await context.params).id);
  return ingredient
    ? NextResponse.json(ingredient)
    : NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
}

export async function PATCH(request: Request, context: Context) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return inventoryWriteRequired(await context.params);
}

export async function DELETE(request: Request, context: Context) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return inventoryWriteRequired(await context.params);
}

function inventoryWriteRequired({ id }: { id: string }) {
  return NextResponse.json(
    {
      error:
        "Hãy cập nhật nguyên liệu từ Kho/Sản phẩm để hồ sơ kho và giá vốn được đồng bộ.",
      editPath: `/admin/inventory/${id}`,
    },
    { status: 409 },
  );
}
