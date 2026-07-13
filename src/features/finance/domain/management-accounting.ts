import type {
  AllocationPolicyVersion, BudgetLine, BudgetVariance, FinanceExpense,
  ManagementAccountingSummary, MonthlyBudget,
} from "@/types";
import { allocateIntegerByWeight } from "./proportional-allocation";

type DriverValues = Record<string, number>;
type DriverValuesByDriver = Partial<Record<AllocationPolicyVersion["driver"], DriverValues>>;

function splitExpense(expense: FinanceExpense) {
  const classification = expense.management;
  if (!classification) return { variable: 0, fixed: expense.amount };
  if (classification.behavior === "variable") return { variable: expense.amount, fixed: 0 };
  if (classification.behavior === "fixed") return { variable: 0, fixed: expense.amount };
  const variableBasisPoints = classification.variablePortionBasisPoints ?? 5_000;
  const variable = Math.round(expense.amount * variableBasisPoints / 10_000);
  return { variable, fixed: expense.amount - variable };
}

export function allocateIndirectCost(input: {
  amount: number;
  policy: AllocationPolicyVersion;
  driverValues?: DriverValues;
}) {
  const weights = input.policy.driver === "manual_weight"
    ? input.policy.targets.map((target) => target.weightBasisPoints)
    : input.policy.targets.map((target) => input.driverValues?.[target.costCenterId] ?? 0);
  const amounts = allocateIntegerByWeight(weights, input.amount);
  return input.policy.targets.map((target, index) => ({
    costCenterId: target.costCenterId,
    amount: amounts[index],
  }));
}

function actualForBudgetLine(
  line: BudgetLine,
  netRevenue: number,
  expenses: FinanceExpense[],
) {
  if (line.metric === "net_revenue") return netRevenue;
  if (line.metric === "production_quantity") return 0;
  return expenses.filter((expense) =>
    (!line.category || expense.category === line.category) &&
    (!line.costCenterId || expense.management?.costCenterId === line.costCenterId) &&
    (!line.channel || expense.management?.channel === line.channel) &&
    (!line.productId || expense.management?.productId === line.productId)
  ).reduce((sum, expense) => sum + expense.amount, 0);
}

export function calculateBudgetVariances(
  budget: MonthlyBudget | null,
  actuals: { netRevenue: number; expenses: FinanceExpense[] },
): BudgetVariance[] {
  if (!budget) return [];
  return budget.lines.map((line) => {
    const actualAmount = actualForBudgetLine(line, actuals.netRevenue, actuals.expenses);
    const varianceAmount = actualAmount - line.plannedAmount;
    return {
      lineId: line.id, metric: line.metric, plannedAmount: line.plannedAmount,
      actualAmount, varianceAmount,
      variancePercent: line.plannedAmount > 0
        ? Math.round(varianceAmount / line.plannedAmount * 1_000) / 10
        : null,
      favorable: line.metric === "net_revenue" ? varianceAmount >= 0 : varianceAmount <= 0,
    };
  });
}

export function calculateManagementAccountingSummary(input: {
  period: string;
  netRevenue: number;
  actualCostOfGoods: number;
  expenses: FinanceExpense[];
  budget: MonthlyBudget | null;
  policies: AllocationPolicyVersion[];
  driverValuesByDriver?: DriverValuesByDriver;
}): ManagementAccountingSummary {
  const centerRows = new Map<string, { directCost: number; allocatedCost: number }>();
  let variableExpenses = 0;
  let directFixedCosts = 0;
  let indirectFixedCosts = 0;
  for (const expense of input.expenses) {
    const centerId = expense.management?.costCenterId ?? "unclassified";
    const row = centerRows.get(centerId) ?? { directCost: 0, allocatedCost: 0 };
    const split = splitExpense(expense);
    variableExpenses += split.variable;
    if (expense.management?.traceability === "indirect") {
      indirectFixedCosts += split.fixed;
      const policy = input.policies.find((item) =>
        item.status === "active" && item.sourceCostCenterId === centerId &&
        new Date(item.effectiveFrom).getTime() <= new Date(`${input.period}-31T23:59:59`).getTime());
      if (policy) {
        const allocations = allocateIndirectCost({
          amount: expense.amount,
          policy,
          driverValues: input.driverValuesByDriver?.[policy.driver],
        });
        if (allocations.every((allocation) => allocation.amount === 0)) {
          row.allocatedCost += expense.amount;
        }
        for (const allocation of allocations) {
          const target = centerRows.get(allocation.costCenterId) ?? { directCost: 0, allocatedCost: 0 };
          target.allocatedCost += allocation.amount;
          centerRows.set(allocation.costCenterId, target);
        }
      } else {
        row.allocatedCost += expense.amount;
      }
    } else {
      directFixedCosts += split.fixed;
      row.directCost += expense.amount;
    }
    centerRows.set(centerId, row);
  }
  const variableCosts = input.actualCostOfGoods + variableExpenses;
  const contributionProfit = input.netRevenue - variableCosts;
  const contributionMarginPercent = input.netRevenue > 0
    ? Math.round(contributionProfit / input.netRevenue * 1_000) / 10
    : 0;
  const controllableProfit = contributionProfit - directFixedCosts;
  const operatingProfit = controllableProfit - indirectFixedCosts;
  const totalFixedCosts = directFixedCosts + indirectFixedCosts;
  const breakEvenRevenue = contributionProfit > 0 && input.netRevenue > 0
    ? Math.ceil(totalFixedCosts / (contributionProfit / input.netRevenue))
    : null;
  return {
    period: input.period, netRevenue: input.netRevenue, variableCosts,
    contributionProfit, contributionMarginPercent, fixedCosts: directFixedCosts,
    controllableProfit, allocatedIndirectCosts: indirectFixedCosts, operatingProfit,
    breakEvenRevenue,
    budgetVariances: calculateBudgetVariances(input.budget, input),
    costByCenter: [...centerRows].map(([costCenterId, row]) => ({
      costCenterId, ...row, totalCost: row.directCost + row.allocatedCost,
    })).sort((left, right) => right.totalCost - left.totalCost),
  };
}

export function simulateManagementScenario(input: {
  netRevenue: number;
  variableCosts: number;
  fixedCosts: number;
  priceChangeBasisPoints: number;
  volumeChangeBasisPoints: number;
  variableCostChangeBasisPoints: number;
  fixedCostChangeBasisPoints: number;
}) {
  const factor = (basisPoints: number) => 1 + basisPoints / 10_000;
  const projectedRevenue = Math.round(input.netRevenue * factor(input.priceChangeBasisPoints) * factor(input.volumeChangeBasisPoints));
  const projectedVariableCosts = Math.round(input.variableCosts * factor(input.volumeChangeBasisPoints) * factor(input.variableCostChangeBasisPoints));
  const projectedFixedCosts = Math.round(input.fixedCosts * factor(input.fixedCostChangeBasisPoints));
  const contributionProfit = projectedRevenue - projectedVariableCosts;
  const operatingProfit = contributionProfit - projectedFixedCosts;
  const contributionMargin = projectedRevenue > 0 ? contributionProfit / projectedRevenue : 0;
  return {
    projectedRevenue, projectedVariableCosts, projectedFixedCosts,
    contributionProfit, operatingProfit,
    breakEvenRevenue: contributionMargin > 0
      ? Math.ceil(projectedFixedCosts / contributionMargin)
      : null,
  };
}
