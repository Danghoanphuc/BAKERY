import {
  CakeSlice,
  CalendarDays,
  ShoppingCart,
  Store,
} from "lucide-react";
import type { ComponentType } from "react";

export type OrderStatusTone = "success" | "neutral" | "warning" | "ready";
export type OrderActionTone = "danger" | "neutral" | "warning";

export interface OrderHistoryItem {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  price: string;
  points: string;
  imageUrl: string;
  status: string;
  statusTone: OrderStatusTone;
  action: string;
  actionTone: OrderActionTone;
  actionIcon: ComponentType<{ className?: string }>;
}

export const orderHistoryDate = "27 thg 6, 2026";

export const orderHistoryFilters = [
  "Tất cả",
  "Tại cửa hàng",
  "Đặt Online",
  "Lịch sử",
];

export const orderHistoryItems: OrderHistoryItem[] = [
  {
    id: "12345",
    title: "Bánh Kem Dâu Tây",
    subtitle: "size 16cm + 2 sản phẩm",
    meta: "Mã đơn: #12345  |  Mua tại: Cửa hàng trung tâm",
    price: "155.000đ",
    points: "+15 Điểm",
    imageUrl:
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=560&q=90",
    status: "Hoàn thành",
    statusTone: "success",
    action: "Mua lại",
    actionTone: "danger",
    actionIcon: ShoppingCart,
  },
  {
    id: "12346",
    title: "Croissant bơ",
    subtitle: "+ 1 đồ uống",
    meta: "Mã đơn: #12346  |  Giao tận nơi",
    price: "67.000đ",
    points: "+7 Điểm",
    imageUrl:
      "https://images.unsplash.com/photo-1623334044303-241021148842?auto=format&fit=crop&w=560&q=90",
    status: "Đã hủy",
    statusTone: "neutral",
    action: "Mua lại",
    actionTone: "neutral",
    actionIcon: ShoppingCart,
  },
  {
    id: "12347",
    title: "Bánh Mì Hoa Cúc",
    subtitle: "+ 1 món khác",
    meta: "Mã đơn: #12347  |  Đặt Online",
    price: "85.000đ",
    points: "+8 Điểm",
    imageUrl:
      "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=560&q=90",
    status: "Đang làm bánh",
    statusTone: "warning",
    action: "Xem chi tiết",
    actionTone: "warning",
    actionIcon: CakeSlice,
  },
  {
    id: "12348",
    title: "Red Velvet mini",
    subtitle: "+ Trà đào cam sả",
    meta: "Mã đơn: #12348  |  Mua tại: Cửa hàng Phú Lợi",
    price: "95.000đ",
    points: "+9 Điểm",
    imageUrl:
      "https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?auto=format&fit=crop&w=560&q=90",
    status: "Sẵn sàng tại quầy",
    statusTone: "ready",
    action: "Đến lấy ngay",
    actionTone: "danger",
    actionIcon: Store,
  },
];

export const CalendarIcon = CalendarDays;
