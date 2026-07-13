import { NextResponse } from "next/server";
import { changeIngredientCost } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const cost = await changeIngredientCost({
      ingredientId: (await context.params).id,
      costPerBaseUnitMicros: body.costPerBaseUnitMicros,
      effectiveFrom: new Date(body.effectiveFrom),
      source: typeof body.source === "string" ? body.source : undefined,
      actor: "admin",
    });
    return NextResponse.json(cost, { status: 201 });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_INGREDIENT_COST";
    return NextResponse.json(
      { error: invalid ? "Invalid ingredient cost" : "Failed to change ingredient cost" },
      { status: invalid ? 400 : 500 },
    );
  }
}

