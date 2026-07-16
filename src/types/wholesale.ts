import type { PaymentTerms, DebtStatus } from "./finance";

export type DealerStatus = "pending" | "approved" | "rejected" | "suspended";
export type DealerTier = "regular" | "silver" | "gold" | "platinum";
export type DealerType = "retail" | "restaurant" | "cafe" | "other";

// Re-export from finance.ts for convenience
export type { PaymentTerms, DebtStatus };

export interface Dealer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  city: string;
  type: DealerType;
  status: DealerStatus;
  tier: DealerTier;
  discountPercent: number; // 0 for regular, 3 for gold, 5 for platinum
  creditLimit: number; // Hạn mức nợ
  currentDebt: number; // Nợ hiện tại
  paymentTerms: "cod" | "net_7" | "next_order";
  businessLicense?: string;
  taxId?: string;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  lastOrderAt?: Date;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealerInput {
  name: string;
  phone: string;
  email?: string;
  address: string;
  district: string;
  city: string;
  type: DealerType;
  businessLicense?: string;
  taxId?: string;
  contactPerson?: string;
  contactPhone?: string;
  notes?: string;
  creditLimit?: number;
  paymentTerms?: "cod" | "net_7" | "next_order";
}

export interface WholesaleProduct {
  id: string;
  productId: string; // Reference to main product
  productName: string;
  wholesalePrice: number; // Giá sỉ cơ bản
  minimumOrderQuantity: number; // Số lượng tối thiểu
  stock: number; // Tồn kho riêng cho sỉ
  isAvailable: boolean;
  tierDiscounts?: {
    silver?: number;
    gold?: number;
    platinum?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WholesaleProductInput {
  productId: string;
  wholesalePrice: number;
  minimumOrderQuantity: number;
  stock: number;
  isAvailable: boolean;
  tierDiscounts?: {
    silver?: number;
    gold?: number;
    platinum?: number;
  };
}

export interface DebtRecord {
  id: string;
  dealerId: string;
  dealerName: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  status: DebtStatus;
  dueDate: Date;
  paymentTerms: "cod" | "net_7" | "next_order";
  paidAmount: number;
  remainingAmount: number;
  paidAt?: Date;
  overdueDays?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRecord {
  id: string;
  dealerId: string;
  dealerName: string;
  amount: number;
  paymentMethod: "cash" | "bank_transfer" | "other";
  reference?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface DeliveryRoute {
  id: string;
  name: string;
  description?: string;
  dealerIds: string[];
  scheduleDays: number[]; // 0-6 (Sunday-Saturday)
  isActive: boolean;
  driver?: string;
  driverPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRouteInput {
  name: string;
  description?: string;
  dealerIds: string[];
  scheduleDays: number[];
  driver?: string;
  driverPhone?: string;
  notes?: string;
}

export interface DeliverySchedule {
  id: string;
  routeId: string;
  routeName: string;
  dealerId: string;
  dealerName: string;
  dealerAddress: string;
  scheduledDate: Date;
  status: "scheduled" | "in_progress" | "completed" | "skipped";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
