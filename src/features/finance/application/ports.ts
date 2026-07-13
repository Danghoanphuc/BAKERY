import type { AppendEconomicEntryInput, EconomicEntry } from "../domain/ledger";
import type { FinancePayment, RecordPaymentInput } from "../domain/payment";

export interface FinanceLedgerRepository {
  appendOnce(input: AppendEconomicEntryInput): Promise<EconomicEntry | null>;
}

export interface FinancePaymentRepository {
  recordOnce(input: RecordPaymentInput): Promise<FinancePayment | null>;
}

export interface FinanceAuditRepository {
  record(event: {
    action: string;
    entityType: string;
    entityId: string;
    actor: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

