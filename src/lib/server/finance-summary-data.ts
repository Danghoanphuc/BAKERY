import type { Firestore } from "firebase-admin/firestore";
import type {
  ExpenseCategory,
  FinanceExpense,
  Order,
  Product,
} from "@/types";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
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

type TimestampLike =
  | Date
  | string
  | number
  | { seconds?: number; toDate?: () => Date }
  | null
  | undefined;

function toDate(value: TimestampLike): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return undefined;
}

function normalizeExpenseCategory(value: unknown): ExpenseCategory {
  return EXPENSE_CATEGORIES.includes(value as ExpenseCategory)
    ? (value as ExpenseCategory)
    : "other";
}

export async function loadFinanceSummaryData(db: Firestore): Promise<{
  orders: Order[];
  products: Product[];
  expenses: FinanceExpense[];
}> {
  const [ordersSnapshot, productsSnapshot, expensesSnapshot] =
    await Promise.all([
      db.collection("orders").orderBy("createdAt", "desc").get(),
      db.collection("products").get(),
      db.collection("finance_expenses").orderBy("date", "desc").get(),
    ]);

  const orders = ordersSnapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      ...data,
      createdAt: toDate(data.createdAt as TimestampLike),
      updatedAt: toDate(data.updatedAt as TimestampLike),
    } as Order;
  });

  const products = productsSnapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  })) as Product[];

  const expenses = expensesSnapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      date: toDate(data.date as TimestampLike) ?? new Date(),
      category: normalizeExpenseCategory(data.category),
      amount: typeof data.amount === "number" ? data.amount : 0,
      note: typeof data.note === "string" ? data.note : undefined,
      vendor: typeof data.vendor === "string" ? data.vendor : undefined,
      createdBy:
        typeof data.createdBy === "string" ? data.createdBy : undefined,
      createdAt: toDate(data.createdAt as TimestampLike),
      updatedAt: toDate(data.updatedAt as TimestampLike),
      management:
        data.management && typeof data.management === "object"
          ? (data.management as FinanceExpense["management"])
          : undefined,
    };
  });

  return { orders, products, expenses };
}
