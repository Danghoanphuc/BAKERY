import { NextResponse } from "next/server";
import { addRecipeVersion, getCostingWorkspace } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const catalog = await getCostingWorkspace();
  return NextResponse.json(catalog.recipes);
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await addRecipeVersion(await request.json()), { status: 201 });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_RECIPE";
    return NextResponse.json({ error: invalid ? "Invalid recipe" : "Failed to create recipe" }, { status: invalid ? 400 : 500 });
  }
}
