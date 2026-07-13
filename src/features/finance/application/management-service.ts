import type { AllocationPolicyVersion, CostCenter, MonthlyBudget } from "@/types";
import { financeRepository } from "../infrastructure/firestore-finance-repository";
import {
  activateAllocationPolicy, approveMonthlyBudget, getApprovedBudget,
  listActiveAllocationPolicies, listCostCenters, persistAllocationPolicy,
  persistCostCenter, persistMonthlyBudget,
} from "../infrastructure/firestore-management-repository";

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function createCostCenter(input: Omit<CostCenter, "id" | "createdAt" | "updatedAt">) {
  if (!input.code.trim() || !input.name.trim() ||
      !["production", "revenue", "service", "administration"].includes(input.type)) {
    throw new Error("INVALID_COST_CENTER");
  }
  const center = await persistCostCenter(input);
  await financeRepository.record({
    action: "cost_center_created", entityType: "cost_center", entityId: center.id,
    actor: "admin", metadata: { code: center.code, type: center.type },
  });
  return center;
}

export async function createAllocationPolicy(input: Omit<AllocationPolicyVersion, "id" | "version" | "status" | "createdAt" | "updatedAt">) {
  const weightTotal = input.targets.reduce((sum, target) => sum + target.weightBasisPoints, 0);
  if (!input.policyCode.trim() || !input.name.trim() || !input.sourceCostCenterId ||
      input.targets.length === 0 || new Set(input.targets.map((item) => item.costCenterId)).size !== input.targets.length ||
      input.targets.some((item) => !item.costCenterId || !Number.isSafeInteger(item.weightBasisPoints) || item.weightBasisPoints < 0) ||
      (input.driver === "manual_weight" && weightTotal !== 10_000) ||
      Number.isNaN(new Date(input.effectiveFrom).getTime())) {
    throw new Error("INVALID_ALLOCATION_POLICY");
  }
  return persistAllocationPolicy({ ...input, effectiveFrom: new Date(input.effectiveFrom) });
}

export async function activatePolicy(policyId: string) {
  await activateAllocationPolicy(policyId);
  await financeRepository.record({
    action: "allocation_policy_activated", entityType: "allocation_policy",
    entityId: policyId, actor: "admin",
  });
}

export async function createMonthlyBudget(input: Omit<MonthlyBudget, "id" | "version" | "status" | "createdAt" | "updatedAt">) {
  if (!periodPattern.test(input.period) || input.lines.length === 0 ||
      input.lines.some((line) => !line.id || !Number.isSafeInteger(line.plannedAmount) || line.plannedAmount < 0)) {
    throw new Error("INVALID_MONTHLY_BUDGET");
  }
  return persistMonthlyBudget(input);
}

export async function approveBudget(budgetId: string) {
  await approveMonthlyBudget(budgetId, "admin");
  await financeRepository.record({
    action: "monthly_budget_approved", entityType: "monthly_budget",
    entityId: budgetId, actor: "admin",
  });
}

export async function getManagementConfiguration(period: string) {
  const [costCenters, policies, budget] = await Promise.all([
    listCostCenters(), listActiveAllocationPolicies(), getApprovedBudget(period),
  ]);
  return { costCenters, policies, budget };
}

