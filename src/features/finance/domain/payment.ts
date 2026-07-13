import type { PaymentMethod } from "@/types";

export type PaymentDirection = "receipt" | "refund";
export type PaymentStatus = "pending" | "confirmed" | "failed" | "reversed";

export type FinancePayment = Readonly<{
  id: string;
  orderId: string;
  direction: PaymentDirection;
  method: PaymentMethod;
  amount: number;
  currency: "VND";
  status: PaymentStatus;
  provider?: "payos";
  providerReference?: string;
  idempotencyKey: string;
  occurredAt: Date;
  confirmedAt?: Date;
  createdAt: Date;
  createdBy: string;
}>;

export type RecordPaymentInput = Omit<FinancePayment, "id" | "currency" | "createdAt">;

