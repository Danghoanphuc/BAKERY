import type { FinancialDimensions } from "./dimensions";

export type EconomicEntryType =
  | "sale"
  | "discount"
  | "delivery_revenue"
  | "payment"
  | "refund"
  | "cost_of_goods_sold"
  | "expense"
  | "adjustment";

export type EconomicEntryStatus = "pending" | "posted" | "reversed";

export type EconomicEntry = Readonly<{
  id: string;
  type: EconomicEntryType;
  status: EconomicEntryStatus;
  amount: number;
  currency: "VND";
  occurredAt: Date;
  postedAt: Date;
  sourceType: "order" | "payment" | "expense" | "adjustment";
  sourceId: string;
  idempotencyKey: string;
  reversalOf?: string;
  dimensions: FinancialDimensions;
  createdBy: string;
}>;

export type AppendEconomicEntryInput = Omit<
  EconomicEntry,
  "id" | "currency" | "postedAt"
>;

