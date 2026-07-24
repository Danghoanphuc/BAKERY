import { NextResponse } from "next/server";
import {
  createFinanceExpense,
  getFinanceExpenses,
} from "@/lib/wholesale-firebase/finance";
import type { ExpenseCategory } from "@/types";
import { requireAdmin } from "@/lib/auth/require-admin";
import { captureExpenseFinancials } from "@/features/wholesale-finance";

const expenseCategories = new Set<ExpenseCategory>([
  "ingredients", "payroll", "utilities", "packaging", "delivery",
  "marketing", "rent", "maintenance", "other",
]);

function isValidManagementClassification(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["fixed", "variable", "mixed"].includes(String(item.behavior)) &&
    ["direct", "indirect"].includes(String(item.traceability)) &&
    ["production", "selling", "administration"].includes(String(item.function)) &&
    typeof item.costCenterId === "string" && item.costCenterId.length > 0 &&
    (item.behavior !== "mixed" ||
      (Number.isSafeInteger(item.variablePortionBasisPoints) &&
       Number(item.variablePortionBasisPoints) >= 0 &&
       Number(item.variablePortionBasisPoints) <= 10_000));
}

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const expenses = await getFinanceExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Error loading expenses:", error);
    return NextResponse.json(
      { error: "Failed to load expenses" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const data = await request.json();

    if (
      !expenseCategories.has(data.category) ||
      !Number.isSafeInteger(data.amount) ||
      data.amount <= 0 ||
      typeof data.date !== "string" ||
      Number.isNaN(new Date(data.date).getTime()) ||
      !isValidManagementClassification(data.management)
    ) {
      return NextResponse.json(
        { error: "Expense category, amount and date are required" },
        { status: 400 },
      );
    }

    const expense = await createFinanceExpense({ ...data, createdBy: "admin" });
    await captureExpenseFinancials(expense, "admin");
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}
