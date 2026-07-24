import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/wholesale-firebase/app";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type {
  FinanceAuditRepository,
  FinanceLedgerRepository,
  FinancePaymentRepository,
} from "../application/ports";
import type { AppendEconomicEntryInput, EconomicEntry } from "../domain/ledger";
import type { FinancePayment, RecordPaymentInput } from "../domain/payment";

const LEDGER_COLLECTION = "finance_ledger_entries";
const PAYMENTS_COLLECTION = "finance_payments";
const AUDIT_COLLECTION = "finance_audit_log";

function documentId(idempotencyKey: string) {
  return encodeURIComponent(idempotencyKey);
}

function withoutUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutUndefined);
  if (value instanceof Date || value === null || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, withoutUndefined(item)]),
  );
}

export class FirestoreFinanceRepository
  implements FinanceLedgerRepository, FinancePaymentRepository, FinanceAuditRepository
{
  async appendOnce(
    input: AppendEconomicEntryInput,
  ): Promise<EconomicEntry | null> {
    const id = documentId(input.idempotencyKey);
    const reference = doc(db, LEDGER_COLLECTION, id);

    const result = await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(reference);
      if (existing.exists()) {
        const current = existing.data() as Record<string, unknown>;
        if (current.status === "pending" && input.status === "posted") {
          transaction.update(reference, {
            status: "posted",
            postedAt: serverTimestamp(),
          });
          return "updated" as const;
        }
        return "unchanged" as const;
      }
      transaction.set(reference, withoutUndefined({
        ...input,
        currency: "VND",
        postedAt: serverTimestamp(),
      }));
      return "created" as const;
    });

    if (result === "unchanged") return null;
    return {
      id,
      ...input,
      currency: "VND",
      postedAt: new Date(),
    };
  }

  async recordOnce(input: RecordPaymentInput): Promise<FinancePayment | null> {
    const id = documentId(input.idempotencyKey);
    const reference = doc(db, PAYMENTS_COLLECTION, id);
    const createdAt = new Date();

    const result = await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(reference);
      if (existing.exists()) {
        const current = existing.data() as Record<string, unknown>;
        if (current.status === "pending" && input.status === "confirmed") {
          transaction.update(reference, {
            status: "confirmed",
            confirmedAt: input.confirmedAt ?? input.occurredAt,
            occurredAt: input.occurredAt,
            providerReference: input.providerReference ?? null,
          });
          return "updated" as const;
        }
        return "unchanged" as const;
      }
      transaction.set(
        reference,
        withoutUndefined({ ...input, currency: "VND", createdAt }),
      );
      return "created" as const;
    });

    if (result === "unchanged") return null;
    return { id, ...input, currency: "VND", createdAt };
  }

  async record(event: {
    action: string;
    entityType: string;
    entityId: string;
    actor: string;
    metadata?: Record<string, unknown>;
  }) {
    await getAdminFirestore().collection(AUDIT_COLLECTION).add(withoutUndefined({
      ...event,
      createdAt: FieldValue.serverTimestamp(),
    }) as Record<string, unknown>);
  }

  async findPayment(idempotencyKey: string): Promise<FinancePayment | null> {
    const snapshot = await getDoc(
      doc(db, PAYMENTS_COLLECTION, documentId(idempotencyKey)),
    );
    return snapshot.exists()
      ? ({ id: snapshot.id, ...snapshot.data() } as FinancePayment)
      : null;
  }
}

export const financeRepository = new FirestoreFinanceRepository();
