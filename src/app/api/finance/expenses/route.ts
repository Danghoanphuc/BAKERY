import { NextResponse } from "next/server";
import {
  createFinanceExpense,
  getFinanceExpenses,
} from "@/lib/firebase/finance";

export async function GET() {
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
  try {
    const data = await request.json();

    if (!data.category || !data.amount || !data.date) {
      return NextResponse.json(
        { error: "Expense category, amount and date are required" },
        { status: 400 },
      );
    }

    const expense = await createFinanceExpense(data);
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}
