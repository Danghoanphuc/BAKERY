import { NextResponse } from "next/server";
import { simulateManagementScenario } from "@/features/finance";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    const values = [body.netRevenue, body.variableCosts, body.fixedCosts,
      body.priceChangeBasisPoints, body.volumeChangeBasisPoints,
      body.variableCostChangeBasisPoints, body.fixedCostChangeBasisPoints];
    if (values.some((value) => !Number.isSafeInteger(value)) ||
        body.netRevenue < 0 || body.variableCosts < 0 || body.fixedCosts < 0) {
      return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
    }
    return NextResponse.json(simulateManagementScenario(body));
  } catch {
    return NextResponse.json({ error: "Invalid scenario" }, { status: 400 });
  }
}

