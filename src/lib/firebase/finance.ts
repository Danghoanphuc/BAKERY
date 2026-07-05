import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import type { ExpenseCategory, FinanceExpense, FinanceExpenseInput } from "@/types";
import { db } from "./config";

const EXPENSES_COLLECTION = "finance_expenses";

type FirestoreDateValue =
  | Date
  | string
  | number
  | { seconds: number; toDate?: () => Date }
  | undefined
  | null;

function toDate(value: FirestoreDateValue): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  }
  return undefined;
}

function cleanDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeExpense(id: string, data: Record<string, unknown>): FinanceExpense {
  return {
    id,
    date: toDate(data.date as FirestoreDateValue) ?? new Date(),
    category: normalizeCategory(data.category),
    amount: typeof data.amount === "number" ? data.amount : 0,
    note: typeof data.note === "string" ? data.note : undefined,
    vendor: typeof data.vendor === "string" ? data.vendor : undefined,
    createdBy: typeof data.createdBy === "string" ? data.createdBy : undefined,
    createdAt: toDate(data.createdAt as FirestoreDateValue),
    updatedAt: toDate(data.updatedAt as FirestoreDateValue),
  };
}

function normalizeCategory(value: unknown): ExpenseCategory {
  const allowed: ExpenseCategory[] = [
    "ingredients",
    "payroll",
    "utilities",
    "packaging",
    "delivery",
    "marketing",
    "rent",
    "maintenance",
    "other",
  ];
  return allowed.includes(value as ExpenseCategory)
    ? (value as ExpenseCategory)
    : "other";
}

export async function getFinanceExpenses(): Promise<FinanceExpense[]> {
  try {
    const expensesQuery = query(
      collection(db, EXPENSES_COLLECTION),
      orderBy("date", "desc"),
    );
    const snapshot = await getDocs(expensesQuery);
    return snapshot.docs.map((expenseDoc) =>
      normalizeExpense(expenseDoc.id, expenseDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching finance expenses:", error);
    return [];
  }
}

export async function createFinanceExpense(
  input: FinanceExpenseInput,
): Promise<FinanceExpense> {
  const date = cleanDate(input.date);
  const payload = {
    date,
    category: input.category,
    amount: Math.max(0, Number(input.amount) || 0),
    note: input.note?.trim() || undefined,
    vendor: input.vendor?.trim() || undefined,
    createdBy: input.createdBy?.trim() || undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const expenseRef = await addDoc(collection(db, EXPENSES_COLLECTION), payload);

  return normalizeExpense(expenseRef.id, {
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
