import type { CartItem } from "./cart";

export type PosTableStatus =
  | "available"
  | "occupied"
  | "payment_requested"
  | "paid"
  | "needs_cleaning";

export type PosTableTabStatus =
  | "open"
  | "payment_pending"
  | "paid"
  | "closed";

export type PosTableRoundStatus = "queued" | "preparing" | "ready" | "served";

export interface PosTable {
  id: string;
  name: string;
  area: string;
  capacity: number;
  sortOrder: number;
  status: PosTableStatus;
  currentTabId?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  openedAt?: string;
  updatedAt: string;
}

export interface PosTableOrderRound {
  id: string;
  number: number;
  items: CartItem[];
  note?: string;
  status: PosTableRoundStatus;
  sentAt: string;
  sentById: string;
  sentByName: string;
}

export interface PosKitchenTicket {
  tabId: string;
  tableId: string;
  tableName: string;
  round: PosTableOrderRound;
}

export interface PosTableTab {
  id: string;
  tableId: string;
  tableName: string;
  status: PosTableTabStatus;
  rounds: PosTableOrderRound[];
  draftItems: CartItem[];
  subtotal: number;
  totalQuantity: number;
  customerName?: string;
  customerPhone?: string;
  note?: string;
  paymentOrderId?: string;
  paymentOrderNumber?: string;
  paymentMethod?: "cash" | "bank_transfer";
  paymentStatus?: "pending" | "paid";
  paymentQrCode?: string;
  paymentCheckoutUrl?: string;
  openedById: string;
  openedByName: string;
  openedAt: string;
  updatedAt: string;
  paidAt?: string;
  closedAt?: string;
}

export interface PosTableServiceSnapshot {
  tables: PosTable[];
  activeTab?: PosTableTab;
}
