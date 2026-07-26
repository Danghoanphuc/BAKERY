import { NextResponse } from "next/server";
import { activateRecipe } from "@/features/wholesale-finance";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";
import {
  getWholesaleRecord,
  updateWholesaleRecord,
} from "@/lib/wholesale-admin-store";
import type { Product } from "@/types";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const recipe = await activateRecipe(
      (await context.params).id,
      getAdminSession(request)?.id ?? "admin",
    );
    const product = (await getWholesaleRecord(
      "products",
      recipe.productId,
    )) as unknown as Product | null;
    if (product?.itemType === "semi_finished") {
      await updateWholesaleRecord("products", recipe.productId, {
        lifecycleStatus: "active",
        manufacturingOutputQuantity: recipe.yieldQuantity,
      });
    }
    return NextResponse.json({
      success: true,
      productId: recipe.productId,
      lifecycleStatus:
        product?.itemType === "semi_finished" ? "active" : product?.lifecycleStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missing = message === "RECIPE_NOT_FOUND";
    const future = message === "RECIPE_NOT_EFFECTIVE";
    return NextResponse.json(
      { error: missing ? "Recipe not found" : future ? "Recipe is not effective yet" : "Failed to activate recipe" },
      { status: missing ? 404 : future ? 409 : 500 },
    );
  }
}
