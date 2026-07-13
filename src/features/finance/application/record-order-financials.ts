import type { Order } from "@/types";
import { buildOrderEconomicEntries } from "../domain/order-financial-events";
import type { FinanceAuditRepository, FinanceLedgerRepository, FinancePaymentRepository } from "./ports";

type Dependencies = {
  ledger: FinanceLedgerRepository;
  payments: FinancePaymentRepository;
  audit: FinanceAuditRepository;
};

export async function recordOrderFinancials(
  order: Order,
  actor: string,
  dependencies: Dependencies,
) {
  const entries = buildOrderEconomicEntries(order, actor);
  await Promise.all(entries.map((entry) => dependencies.ledger.appendOnce(entry)));

  const paymentMethod = order.paymentMethod ?? "other";
  const isCollected = order.paymentStatus === "paid";
  const payment = await dependencies.payments.recordOnce({
    orderId: order.id,
    direction: "receipt",
    method: paymentMethod,
    amount: order.totalAmount,
    status: isCollected ? "confirmed" : "pending",
    provider: paymentMethod === "bank_transfer" ? "payos" : undefined,
    providerReference: order.payosReference,
    idempotencyKey: `order:${order.id}:receipt`,
    occurredAt: isCollected ? order.paidAt ?? new Date() : new Date(order.createdAt),
    confirmedAt: isCollected ? order.paidAt ?? new Date() : undefined,
    createdBy: actor,
  });

  if (isCollected) {
    await dependencies.ledger.appendOnce({
      type: "payment",
      status: "posted",
      amount: order.totalAmount,
      occurredAt: order.paidAt ?? new Date(),
      sourceType: "payment",
      sourceId: payment?.id ?? order.id,
      idempotencyKey: `order:${order.id}:payment:ledger`,
      dimensions: {
        branchId: "main",
        channel: order.salesChannel,
        customerId: order.customerId,
        paymentMethod,
      },
      createdBy: actor,
    });
  }

  await dependencies.audit.record({
    action: "order_financials_recorded",
    entityType: "order",
    entityId: order.id,
    actor,
    metadata: { entryCount: entries.length, paymentStatus: order.paymentStatus ?? "unpaid" },
  });
}
