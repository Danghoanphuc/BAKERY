import type { CartItem } from "./cart";
import type { Product } from "./product";
import type { VoucherUseMode } from "./voucher";
import type { OrderItemFinancialSnapshot, PaymentMethod, SalesChannel } from "./finance";

export type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "processing" | "completed" | "delivered" | "cancelled";
export type OrderType = "delivery" | "pickup" | "preorder";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  at: string;
  note?: string;
  actor?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: CartItem[];
  totalAmount: number;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
  payosOrderCode?: number;
  payosPaymentLinkId?: string;
  payosCheckoutUrl?: string;
  payosQrCode?: string;
  payosReference?: string;
  payosTransactionDateTime?: string;
  payosStockDeducted?: boolean;
  salesChannel?: SalesChannel;
  deliveryAddress?: string;
  pickupTime?: string;
  notes?: string;
  internalNotes?: string;
  cancelReason?: string;
  assignedTo?: string;
  deliveryFee?: number;
  discountAmount?: number;
  productSubtotal?: number;
  estimatedCostOfGoods?: number;
  actualCostOfGoods?: number;
  estimatedGrossProfit?: number;
  itemFinancialSnapshots?: OrderItemFinancialSnapshot[];
  loyaltyPointsEarned?: number;
  voucherCode?: string;
  voucherId?: string;
  voucherUseMode?: VoucherUseMode;
  statusHistory?: OrderStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryProduct extends Product {
  stock: number;
  isAvailable: boolean;
  category: string;
}
