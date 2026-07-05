export type ExpenseCategory =
  | "ingredients"
  | "payroll"
  | "utilities"
  | "packaging"
  | "delivery"
  | "marketing"
  | "rent"
  | "maintenance"
  | "other";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "cod"
  | "card"
  | "wallet"
  | "other";

export type SalesChannel =
  | "pos"
  | "web_delivery"
  | "web_pickup"
  | "social"
  | "admin";

export interface FinanceExpense {
  id: string;
  date: Date;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  vendor?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FinanceExpenseInput {
  date: Date | string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  vendor?: string;
  createdBy?: string;
}

export interface ProductCostBreakdown {
  ingredientsCost?: number;
  packagingCost?: number;
  laborCost?: number;
  overheadCost?: number;
  wastePercent?: number;
  targetGrossMarginPercent?: number;
}
