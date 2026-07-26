import { NextResponse } from "next/server";
import { getPurchaseReceipts, receiveIngredientPurchase } from "@/features/wholesale-finance";
import { getAdminSession, requireAdmin } from "@/lib/auth/require-admin";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json(await getPurchaseReceipts());
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const session = getAdminSession(request);
    const receipt = await receiveIngredientPurchase({
      ...body, occurredAt: new Date(body.occurredAt), actor: session?.id ?? "admin",
    });
    return NextResponse.json(receipt, { status: receipt ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const invalid = message === "INVALID_PURCHASE_RECEIPT" || message === "PURCHASE_UNIT_MISMATCH";
    const unavailable = message === "INGREDIENT_NOT_AVAILABLE" || message.startsWith("INGREDIENT_NOT_AVAILABLE:");
    return NextResponse.json(
      { error: invalid ? "Invalid purchase receipt" : unavailable ? "Ingredient is unavailable" : "Failed to receive purchase" },
      { status: invalid ? 400 : unavailable ? 409 : 500 },
    );
  }
}
