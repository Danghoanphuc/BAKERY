import { NextResponse } from "next/server";
import { getOrders, getAllProducts } from "@/lib/db";
import { getFinanceExpenses } from "@/lib/firebase/finance";
import { buildFinanceSummary, type FinancePeriod } from "@/lib/finance";

function getPeriod(value: string | null): FinancePeriod {
  if (value === "today" || value === "month" || value === "all") return value;
  return "today";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const period = getPeriod(url.searchParams.get("period"));
    const [orders, products, expenses] = await Promise.all([
      getOrders(),
      getAllProducts(),
      getFinanceExpenses(),
    ]);

    return NextResponse.json(
      buildFinanceSummary({ orders, products, expenses, period }),
    );
  } catch (error) {
    console.error("Error loading finance summary:", error);
    return NextResponse.json(
      { error: "Failed to load finance summary" },
      { status: 500 },
    );
  }
}
