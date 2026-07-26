import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listWholesaleRecords } from "@/lib/wholesale-admin-store";
import { buildProductCostSummaries } from "@/features/wholesale-finance";
import type { Product } from "@/types";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const products = await listWholesaleRecords("products") as unknown as Product[];
    const byProductId = await buildProductCostSummaries(products);
    const values = Object.values(byProductId);
    return NextResponse.json({
      byProductId,
      coverage: {
        total: products.length,
        recipe: values.filter((item) => item.source === "recipe").length,
        legacy: values.filter((item) => item.source === "legacy").length,
        missing: values.filter((item) => item.source === "missing").length,
      },
    });
  } catch (error) {
    console.error("Failed to build costing summary:", error);
    return NextResponse.json(
      { error: "Failed to load costing summary" },
      { status: 500 },
    );
  }
}
