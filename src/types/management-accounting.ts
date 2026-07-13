import type { ExpenseCategory, SalesChannel } from "./finance";

export type CostBehavior = "fixed" | "variable" | "mixed";
export type CostTraceability = "direct" | "indirect";
export type CostFunction = "production" | "selling" | "administration";
export type CostCenterType = "production" | "revenue" | "service" | "administration";

export interface CostCenter {
  id: string;
  code: string;
  name: string;
  type: CostCenterType;
  isActive: boolean;
  channel?: SalesChannel;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpenseManagementClassification {
  behavior: CostBehavior;
  traceability: CostTraceability;
  function: CostFunction;
  costCenterId: string;
  channel?: SalesChannel;
  productId?: string;
  campaignId?: string;
  variablePortionBasisPoints?: number;
}

export type AllocationDriver =
  | "revenue"
  | "order_count"
  | "production_quantity"
  | "direct_labor_cost"
  | "manual_weight";

export interface AllocationTarget {
  costCenterId: string;
  weightBasisPoints: number;
}

export interface AllocationPolicyVersion {
  id: string;
  policyCode: string;
  name: string;
  version: number;
  status: "draft" | "active" | "retired";
  sourceCostCenterId: string;
  driver: AllocationDriver;
  targets: AllocationTarget[];
  effectiveFrom: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BudgetMetric = "net_revenue" | "expense" | "production_quantity";

export interface BudgetLine {
  id: string;
  metric: BudgetMetric;
  plannedAmount: number;
  costCenterId?: string;
  category?: ExpenseCategory;
  channel?: SalesChannel;
  productId?: string;
}

export interface MonthlyBudget {
  id: string;
  period: string;
  version: number;
  status: "draft" | "approved" | "closed";
  lines: BudgetLine[];
  createdBy: string;
  approvedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BudgetVariance {
  lineId: string;
  metric: BudgetMetric;
  plannedAmount: number;
  actualAmount: number;
  varianceAmount: number;
  variancePercent: number | null;
  favorable: boolean;
}

export interface ManagementAccountingSummary {
  period: string;
  netRevenue: number;
  variableCosts: number;
  contributionProfit: number;
  contributionMarginPercent: number;
  fixedCosts: number;
  controllableProfit: number;
  allocatedIndirectCosts: number;
  operatingProfit: number;
  breakEvenRevenue: number | null;
  budgetVariances: BudgetVariance[];
  costByCenter: Array<{ costCenterId: string; directCost: number; allocatedCost: number; totalCost: number }>;
}
