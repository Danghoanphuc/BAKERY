import { nonNegativeVnd } from "../domain/money";
import type { FinanceAuditRepository, FinanceLedgerRepository, FinancePaymentRepository } from "./ports";
import type { PaymentMethod } from "@/types";

type Dependencies = {
  ledger: FinanceLedgerRepository;
  payments: FinancePaymentRepository;
  audit: FinanceAuditRepository;
};

export async function recordRefund(input: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  occurredAt: Date;
  reason: string;
  actor: string;
  idempotencyKey: string;
}, dependencies: Dependencies) {
  const amount = nonNegativeVnd(input.amount).amount;
  if (amount === 0 || !input.reason.trim()) throw new Error("INVALID_REFUND");
  const payment = await dependencies.payments.recordOnce({
    orderId: input.orderId,
    direction: "refund",
    method: input.method,
    amount,
    status: "confirmed",
    idempotencyKey: input.idempotencyKey,
    occurredAt: input.occurredAt,
    confirmedAt: input.occurredAt,
    createdBy: input.actor,
  });
  await dependencies.ledger.appendOnce({
    type: "refund", status: "posted", amount, occurredAt: input.occurredAt,
    sourceType: "payment", sourceId: payment?.id ?? input.orderId,
    idempotencyKey: `${input.idempotencyKey}:ledger`,
    dimensions: { branchId: "main", paymentMethod: input.method },
    createdBy: input.actor,
  });
  await dependencies.audit.record({
    action: "refund_recorded", entityType: "order", entityId: input.orderId,
    actor: input.actor, metadata: { amount, reason: input.reason },
  });
}

export async function recordAdjustment(input: {
  sourceId: string;
  amount: number;
  occurredAt: Date;
  reason: string;
  actor: string;
  idempotencyKey: string;
}, dependencies: Pick<Dependencies, "ledger" | "audit">) {
  const amount = nonNegativeVnd(input.amount).amount;
  if (amount === 0 || !input.reason.trim()) throw new Error("INVALID_ADJUSTMENT");
  await dependencies.ledger.appendOnce({
    type: "adjustment", status: "posted", amount, occurredAt: input.occurredAt,
    sourceType: "adjustment", sourceId: input.sourceId,
    idempotencyKey: input.idempotencyKey, dimensions: { branchId: "main" },
    createdBy: input.actor,
  });
  await dependencies.audit.record({
    action: "adjustment_recorded", entityType: "adjustment", entityId: input.sourceId,
    actor: input.actor, metadata: { amount, reason: input.reason },
  });
}

