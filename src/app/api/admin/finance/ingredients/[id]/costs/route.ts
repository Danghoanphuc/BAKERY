import { NextResponse } from "next/server";
import { changeIngredientCost, getIngredientCosts } from "@/features/finance";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await getIngredientCosts((await context.params).id));
  } catch (error) {
    const missing = error instanceof Error && error.message === "INGREDIENT_NOT_FOUND";
    return NextResponse.json(
      { error: missing ? "Ingredient not found" : "Failed to read ingredient costs" },
      { status: missing ? 404 : 500 },
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const session = getAdminSession(request);
    const cost = await changeIngredientCost({
      ingredientId: (await context.params).id,
      costPerBaseUnitMicros: body.costPerBaseUnitMicros,
      effectiveFrom: new Date(body.effectiveFrom),
      source: typeof body.source === "string" ? body.source : undefined,
      actor: session?.id ?? "admin",
    });
    return NextResponse.json(cost, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalid = message === "INVALID_INGREDIENT_COST";
    const missing = message === "INGREDIENT_NOT_FOUND";
    return NextResponse.json(
      { error: invalid ? "Invalid ingredient cost" : missing ? "Ingredient not found" : "Failed to change ingredient cost" },
      { status: invalid ? 400 : missing ? 404 : 500 },
    );
  }
}
