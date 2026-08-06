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
  groupCode?: string;
  name: string;
  baseUnit: IngredientBaseUnit;
  /** Supplier-facing package name, for example "bao", "thùng", or "chai". */
  purchaseUnit?: string;
  /** Quantity contained in one purchase package, normalized to baseUnit. */
  purchasePackQuantity?: number;
  /** Reference price for one purchase package, in VND. */
  referencePurchasePrice?: number;
  costPerBaseUnitMicros: number;
  isActive: boolean;
  createdAt?: Date;
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
export type RecipeComponentType = "ingredient" | "semi_finished";

export interface RecipeIngredientLine {
  ingredientId: string;
  quantity: number;
  /** Omitted on legacy BOM rows, which are always raw ingredients. */
  componentType?: RecipeComponentType;
}

export interface RecipePackagingCostLine {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface RecipeDirectLaborCostLine {
  id: string;
  role: string;
  people: number;
  minutes: number;
  hourlyRate: number;
}

export interface RecipeWasteCalculation {
  plannedQuantity: number;
  goodQuantity: number;
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
  packagingCostLines?: RecipePackagingCostLine[];
  directLaborCostLines?: RecipeDirectLaborCostLine[];
  wasteCalculation?: RecipeWasteCalculation;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Monthly indirect production costs used to derive a standard overhead rate.
 * Direct ingredients, packaging, and direct labor intentionally do not belong here.
 */
export interface ManufacturingOverheadSettings {
  utilitiesPerMonth: number;
  equipmentDepreciationPerMonth: number;
  premisesPerMonth: number;
  maintenancePerMonth: number;
  otherIndirectCostsPerMonth: number;
  productiveHoursPerMonth: number;
}

export interface OrderItemFinancialSnapshot {
  orderItemId: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantSku?: string;
  variantBarcode?: string;
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
