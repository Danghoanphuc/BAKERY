import { NextResponse } from "next/server";
import { receiveIngredientPurchase } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const receipt = await receiveIngredientPurchase({
      ...body, occurredAt: new Date(body.occurredAt), actor: "admin",
    });
    return NextResponse.json(receipt, { status: receipt ? 201 : 200 });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "INVALID_PURCHASE_RECEIPT";
    return NextResponse.json({ error: invalid ? "Invalid purchase receipt" : "Failed to receive purchase" }, { status: invalid ? 400 : 500 });
  }
}

