import { NextResponse } from "next/server";
import { createMagicLinkForCustomer } from "@/lib/firebase";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const result = await createMagicLinkForCustomer(id);
    return NextResponse.json({
      token: result.token,
      urlPath: result.urlPath,
      expiresAt: result.expiresAt,
      customer: result.customer,
    });
  } catch (error) {
    console.error("Error creating customer magic link:", error);
    return NextResponse.json(
      { error: "Failed to create magic link" },
      { status: 500 },
    );
  }
}