import { NextResponse } from "next/server";
import { activateRecipe } from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    await activateRecipe((await context.params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const missing = error instanceof Error && error.message === "RECIPE_NOT_FOUND";
    return NextResponse.json({ error: missing ? "Recipe not found" : "Failed to activate recipe" }, { status: missing ? 404 : 500 });
  }
}
