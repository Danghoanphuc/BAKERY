import type { PaymentTerms, DebtStatus } from "./finance";

export type DealerStatus = "pending" | "approved" | "rejected" | "suspended";
export type DealerTier = "regular" | "silver" | "gold" | "platinum";
export type DealerType = "retail" | "restaurant" | "cafe" | "other";

export interface WholesalePriceBreak {
  minQuantity: number;
  unitPrice: number;
}

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
  lat?: number;
  lng?: number;
  placeId?: string;
  assignedRepId?: string;
  visitCadenceDays?: number;
  lastVisitAt?: Date;
  nextVisitAt?: Date;
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
  lat?: number;
  lng?: number;
  placeId?: string;
  assignedRepId?: string;
  visitCadenceDays?: number;
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
  orderIncrement?: number;
  sellUnitLabel?: string;
  unitsPerSellUnit?: number;
  sellUnitSku?: string;
  sellUnitBarcode?: string;
  locationId?: string;
  leadTimeHours?: number;
  priceBreaks?: WholesalePriceBreak[];
  eligibleDealerTypes?: DealerType[];
  eligibleDealerTiers?: DealerTier[];
  deliveryAreas?: string[];
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
  orderIncrement?: number;
  sellUnitLabel?: string;
  unitsPerSellUnit?: number;
  sellUnitSku?: string;
  sellUnitBarcode?: string;
  locationId?: string;
  leadTimeHours?: number;
  priceBreaks?: WholesalePriceBreak[];
  eligibleDealerTypes?: DealerType[];
  eligibleDealerTiers?: DealerTier[];
  deliveryAreas?: string[];
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
  dueDate?: Date;
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

export type SalesRouteRunStatus =
  | "draft"
  | "published"
  | "in_progress"
  | "completed"
  | "cancelled";

export type SalesRouteStopStatus =
  | "pending"
  | "arrived"
  | "completed"
  | "skipped";

export type SalesRouteVisitOutcome =
  | "ordered"
  | "no_order"
  | "not_met"
  | "follow_up"
  | "closed";

export interface SalesRouteLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  capturedAt: Date;
  address?: string;
}

export interface SalesRouteTemplateStop {
  dealerId: string;
  sequence: number;
}

export interface SalesRouteTemplate {
  id: string;
  name: string;
  description?: string;
  scheduleDays: number[];
  assignedRepId: string;
  assignedRepName: string;
  stops: SalesRouteTemplateStop[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesRouteTemplateInput {
  name: string;
  description?: string;
  scheduleDays: number[];
  assignedRepId: string;
  assignedRepName: string;
  dealerIds: string[];
}

export interface SalesRouteDealerSnapshot {
  name: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  contactPerson?: string;
  currentDebt: number;
  creditLimit: number;
  paymentTerms: PaymentTerms;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export interface SalesRouteStop {
  id: string;
  runId: string;
  dealerId: string;
  dealer: SalesRouteDealerSnapshot;
  sequence: number;
  status: SalesRouteStopStatus;
  checkIn?: SalesRouteLocation;
  checkOut?: SalesRouteLocation;
  outcome?: SalesRouteVisitOutcome;
  note?: string;
  skipReason?: string;
  locationExceptionReason?: string;
  orderId?: string;
  orderNumber?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesRouteRun {
  id: string;
  templateId: string;
  templateName: string;
  businessDate: string;
  assignedRepId: string;
  assignedRepName: string;
  status: SalesRouteRunStatus;
  totalStops: number;
  completedStops: number;
  skippedStops: number;
  orderedStops: number;
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  stops?: SalesRouteStop[];
}

export interface WholesaleRouteOrderLineInput {
  wholesaleProductId: string;
  quantity: number;
}
