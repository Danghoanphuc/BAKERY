import {
  addDoc, collection, getDocs, query, serverTimestamp, where, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import type { AllocationPolicyVersion, CostCenter, MonthlyBudget } from "@/types";

const COST_CENTERS = "management_cost_centers";
const POLICIES = "management_allocation_policies";
const BUDGETS = "management_monthly_budgets";

function date(value: unknown) {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate() as Date;
  }
  return new Date(String(value));
}

export async function listCostCenters(): Promise<CostCenter[]> {
  const snapshot = await getDocs(collection(db, COST_CENTERS));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as CostCenter));
}

export async function persistCostCenter(input: Omit<CostCenter, "id" | "createdAt" | "updatedAt">) {
  const reference = await addDoc(collection(db, COST_CENTERS), {
    ...input, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { id: reference.id, ...input, createdAt: new Date(), updatedAt: new Date() };
}

export async function listActiveAllocationPolicies(): Promise<AllocationPolicyVersion[]> {
  const snapshot = await getDocs(query(collection(db, POLICIES), where("status", "==", "active")));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, ...data, effectiveFrom: date(data.effectiveFrom) } as AllocationPolicyVersion;
  });
}

export async function listAllAllocationPolicies(): Promise<AllocationPolicyVersion[]> {
  const snapshot = await getDocs(collection(db, POLICIES));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return { id: item.id, ...data, effectiveFrom: date(data.effectiveFrom) } as AllocationPolicyVersion;
  }).sort((left, right) => right.version - left.version);
}

export async function persistAllocationPolicy(
  input: Omit<AllocationPolicyVersion, "id" | "version" | "status" | "createdAt" | "updatedAt">,
) {
  const snapshot = await getDocs(query(collection(db, POLICIES), where("policyCode", "==", input.policyCode)));
  const version = Math.max(0, ...snapshot.docs.map((item) => Number(item.data().version ?? 0))) + 1;
  const reference = await addDoc(collection(db, POLICIES), {
    ...input, version, status: "draft", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { id: reference.id, ...input, version, status: "draft" as const };
}

export async function activateAllocationPolicy(policyId: string) {
  const snapshot = await getDocs(collection(db, POLICIES));
  const target = snapshot.docs.find((item) => item.id === policyId);
  if (!target) throw new Error("ALLOCATION_POLICY_NOT_FOUND");
  const policyCode = target.data().policyCode;
  const batch = writeBatch(db);
  snapshot.docs.filter((item) => item.data().policyCode === policyCode).forEach((item) => {
    batch.update(item.ref, {
      status: item.id === policyId ? "active" : "retired",
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function getApprovedBudget(period: string): Promise<MonthlyBudget | null> {
  const snapshot = await getDocs(query(collection(db, BUDGETS), where("period", "==", period)));
  const approved = snapshot.docs.filter((item) => item.data().status === "approved")
    .sort((left, right) => Number(right.data().version ?? 0) - Number(left.data().version ?? 0))[0];
  return approved ? ({ id: approved.id, ...approved.data() } as MonthlyBudget) : null;
}

export async function listMonthlyBudgets(period: string): Promise<MonthlyBudget[]> {
  const snapshot = await getDocs(query(collection(db, BUDGETS), where("period", "==", period)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as MonthlyBudget))
    .sort((left, right) => right.version - left.version);
}

export async function persistMonthlyBudget(
  input: Omit<MonthlyBudget, "id" | "version" | "status" | "createdAt" | "updatedAt">,
) {
  const snapshot = await getDocs(query(collection(db, BUDGETS), where("period", "==", input.period)));
  const version = Math.max(0, ...snapshot.docs.map((item) => Number(item.data().version ?? 0))) + 1;
  const reference = await addDoc(collection(db, BUDGETS), {
    ...input, version, status: "draft", createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return { id: reference.id, ...input, version, status: "draft" as const };
}

export async function approveMonthlyBudget(budgetId: string, approvedBy: string) {
  const snapshot = await getDocs(collection(db, BUDGETS));
  const target = snapshot.docs.find((item) => item.id === budgetId);
  if (!target) throw new Error("BUDGET_NOT_FOUND");
  const period = target.data().period;
  const batch = writeBatch(db);
  snapshot.docs.filter((item) => item.data().period === period).forEach((item) => {
    batch.update(item.ref, {
      status: item.id === budgetId ? "approved" : "closed",
      ...(item.id === budgetId ? { approvedBy } : {}),
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}
