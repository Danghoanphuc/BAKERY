export type DeliveryMode = "delivery" | "pickup";
export type OrderTimingType = "now" | "scheduled";

export interface OrderTiming {
  type: OrderTimingType;
  scheduledDate?: string; // ISO 8601 format
  scheduledTime?: string; // HH:mm format
}

export interface OrderConfig {
  deliveryMode: DeliveryMode;
  orderTiming: OrderTiming;
  deliveryAddress?: {
    street: string;
    district: string;
    city: string;
  };
}
