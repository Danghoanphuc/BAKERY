import { NextResponse } from "next/server";
import { addIngredient, getStandardCostCatalog } from "@/features/wholesale-finance";
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
  try {
    return NextResponse.json(await addIngredient(await request.json()), { status: 201 });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_INGREDIENT";
    return NextResponse.json({ error: invalid ? "Invalid ingredient" : "Failed to create ingredient" }, { status: invalid ? 400 : 500 });
  }
}

