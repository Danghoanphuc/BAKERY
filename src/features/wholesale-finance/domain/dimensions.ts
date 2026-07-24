import type { PaymentMethod, SalesChannel } from "@/types";

export type FinancialDimensions = Readonly<{
  branchId: string;
  channel?: SalesChannel;
  costCenterId?: string;
  productId?: string;
  customerId?: string;
  campaignId?: string;
  paymentMethod?: PaymentMethod;
}>;

export const DEFAULT_BRANCH_ID = "main";

