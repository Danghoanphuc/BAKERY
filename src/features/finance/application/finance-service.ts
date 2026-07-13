import type { Order } from "@/types";
import { financeRepository } from "../infrastructure/firestore-finance-repository";
import { recordOrderFinancials } from "./record-order-financials";
import { recordAdjustment, recordRefund } from "./record-financial-adjustment";
import type { FinanceExpense, PaymentMethod } from "@/types";

export async function captureOrderFinancials(order: Order, actor: string) {
  return recordOrderFinancials(order, actor, {
    ledger: financeRepository,
    payments: financeRepository,
    audit: financeRepository,
  });
}

export async function captureExpenseFinancials(expense: FinanceExpense, actor: string) {
  await financeRepository.appendOnce({
    type: "expense", status: "posted", amount: expense.amount,
    occurredAt: expense.date, sourceType: "expense", sourceId: expense.id,
    idempotencyKey: `expense:${expense.id}:posted`,
    dimensions: { branchId: "main", costCenterId: expense.category },
    createdBy: actor,
  });
  await financeRepository.record({
    action: "expense_created", entityType: "expense", entityId: expense.id,
    actor, metadata: { amount: expense.amount, category: expense.category },
  });
}

export function captureRefund(input: {
  orderId: string; amount: number; method: PaymentMethod; occurredAt: Date;
  reason: string; actor: string; idempotencyKey: string;
}) {
  return recordRefund(input, {
    ledger: financeRepository, payments: financeRepository, audit: financeRepository,
  });
}

export function captureAdjustment(input: {
  sourceId: string; amount: number; occurredAt: Date; reason: string;
  actor: string; idempotencyKey: string;
}) {
  return recordAdjustment(input, { ledger: financeRepository, audit: financeRepository });
}
