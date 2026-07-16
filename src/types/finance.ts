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
  | "admin"
  | "wholesale";

export type PaymentTerms = "cod" | "net_7" | "next_order";
export type DebtStatus = "current" | "warning" | "overdue" | "blocked";

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
  management?: import("./management-accounting").ExpenseManagementClassification;
}

export interface FinanceExpenseInput {
  date: Date | string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
  vendor?: string;
  createdBy?: string;
  management?: import("./management-accounting").ExpenseManagementClassification;
}

export interface ProductCostBreakdown {
  ingredientsCost?: number;
  packagingCost?: number;
  laborCost?: number;
  overheadCost?: number;
  wastePercent?: number;
  targetGrossMarginPercent?: number;
}

export type IngredientBaseUnit = "gram" | "millilitre" | "each";

export interface FinanceIngredient {
  id: string;
  code: string;
  name: string;
  baseUnit: IngredientBaseUnit;
  costPerBaseUnitMicros: number;
  isActive: boolean;
  updatedAt?: Date;
}

export interface IngredientCostVersion {
  id: string;
  ingredientId: string;
  costPerBaseUnitMicros: number;
  effectiveFrom: Date;
  source?: string;
  createdBy: string;
  createdAt?: Date;
}

export type RecipeVersionStatus = "draft" | "active" | "retired";

export interface RecipeIngredientLine {
  ingredientId: string;
  quantity: number;
}

export interface RecipeVersion {
  id: string;
  productId: string;
  version: number;
  status: RecipeVersionStatus;
  effectiveFrom: Date;
  yieldQuantity: number;
  ingredients: RecipeIngredientLine[];
  packagingCostPerBatch: number;
  directLaborCostPerBatch: number;
  overheadCostPerBatch: number;
  wasteBasisPoints: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderItemFinancialSnapshot {
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  grossRevenue: number;
  allocatedDiscount: number;
  netRevenue: number;
  ingredientCost: number;
  packagingCost: number;
  directLaborCost: number;
  overheadCost: number;
  wasteCost: number;
  unitCost: number;
  totalCost: number;
  grossProfit: number;
  costingSource: "recipe" | "legacy" | "missing";
  recipeVersionId?: string;
  costingVersion: string;
}
