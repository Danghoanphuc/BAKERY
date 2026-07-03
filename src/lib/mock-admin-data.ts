/**
 * ⚠️ FILE NÀY CHỨA MOCK DATA CŨ - CHỈ DÙNG CHO THAM KHẢO
 *
 * Dữ liệu thực đã được chuyển sang Firebase.
 * Vui lòng sử dụng các functions trong src/lib/firebase/ để lấy dữ liệu.
 *
 * File này được giữ lại để tham khảo cấu trúc dữ liệu cho Admin panel.
 */

import type { CartItem, Product } from "@/types";

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";
export type OrderType = "delivery" | "pickup" | "preorder";

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  items: CartItem[];
  totalAmount: number;
  orderType: OrderType;
  status: OrderStatus;
  deliveryAddress?: string;
  pickupTime?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Product for Inventory Management
export interface InventoryProduct extends Product {
  stock: number;
  isAvailable: boolean;
  category: string;
}

// Mock Products for Inventory
export const mockInventoryProducts: InventoryProduct[] = [
  {
    id: "1",
    name: "Bánh Red Velvet",
    price: 250000,
    imageUrl: "https://loremflickr.com/150/150?lock=1",
    categoryId: "1",
    category: "Bánh sinh nhật",
    description: "Bánh Red Velvet thơm ngon với kem cheese",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 15,
    isAvailable: true,
    sizeOptions: [
      { id: "16cm", label: "16cm", priceAdjustment: 0 },
      { id: "20cm", label: "20cm", priceAdjustment: 50000 },
      { id: "24cm", label: "24cm", priceAdjustment: 100000 },
    ],
    flavorOptions: [
      { id: "original", label: "Truyền thống" },
      { id: "cheese", label: "Cream cheese" },
      { id: "dark", label: "Dark chocolate" },
    ],
    requiresMessage: true,
  },
  {
    id: "2",
    name: "Bánh Chocolate",
    price: 200000,
    imageUrl: "https://loremflickr.com/150/150?lock=2",
    categoryId: "1",
    category: "Bánh sinh nhật",
    description: "Bánh chocolate đậm đà hương vị",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 20,
    isAvailable: true,
    sizeOptions: [
      { id: "16cm", label: "16cm", priceAdjustment: 0 },
      { id: "20cm", label: "20cm", priceAdjustment: 50000 },
    ],
    flavorOptions: [
      { id: "milk", label: "Sô-cô-la sữa" },
      { id: "dark", label: "Sô-cô-la đen" },
    ],
    requiresMessage: true,
  },
  {
    id: "3",
    name: "Bánh Vanilla",
    price: 180000,
    imageUrl: "https://loremflickr.com/150/150?lock=3",
    categoryId: "1",
    category: "Bánh sinh nhật",
    description: "Bánh vanilla nhẹ nhàng thơm mát",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 12,
    isAvailable: true,
    requiresMessage: true,
  },
  {
    id: "4",
    name: "Bánh Tiramisu",
    price: 300000,
    imageUrl: "https://loremflickr.com/150/150?lock=4",
    categoryId: "3",
    category: "Bánh lạnh",
    description: "Bánh Tiramisu Ý nguyên bản",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 8,
    isAvailable: true,
    sizeOptions: [
      { id: "small", label: "Nhỏ (4 người)", priceAdjustment: 0 },
      { id: "medium", label: "Vừa (6-8 người)", priceAdjustment: 80000 },
      { id: "large", label: "Lớn (10-12 người)", priceAdjustment: 150000 },
    ],
    flavorOptions: [
      { id: "classic", label: "Cổ điển" },
      { id: "mocha", label: "Mocha" },
    ],
  },
  {
    id: "5",
    name: "Bánh Opera",
    price: 320000,
    imageUrl: "https://loremflickr.com/150/150?lock=5",
    categoryId: "3",
    category: "Bánh lạnh",
    description: "Bánh Opera nhiều lớp tinh tế",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 0,
    isAvailable: false,
  },
  {
    id: "6",
    name: "Croissant Bơ",
    price: 45000,
    imageUrl: "https://loremflickr.com/150/150?lock=6",
    categoryId: "2",
    category: "Bánh mì ngọt",
    description: "Croissant bơ tươi giòn tan",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 50,
    isAvailable: true,
  },
  {
    id: "7",
    name: "Bánh Mì Sandwich",
    price: 55000,
    imageUrl: "https://loremflickr.com/150/150?lock=7",
    categoryId: "2",
    category: "Bánh mì ngọt",
    description: "Bánh mì sandwich thịt nguội",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 30,
    isAvailable: true,
  },
  {
    id: "8",
    name: "Matcha Latte",
    price: 65000,
    imageUrl: "https://loremflickr.com/150/150?lock=8",
    categoryId: "5",
    category: "Đồ uống",
    description: "Matcha latte đậm đà hương trà",
    availableForDelivery: true,
    availableForPickup: true,
    stock: 25,
    isAvailable: true,
  },
];

// Mock Orders Data
export const mockOrders: Order[] = [
  {
    id: "ORD001",
    orderNumber: "DH-2026-001",
    customerName: "Nguyễn Văn An",
    customerPhone: "0901234567",
    customerEmail: "nguyenvanan@email.com",
    items: [
      {
        cartItemId: "1|16cm|original|Chúc mừng sinh nhật con yêu|5",
        productId: "1",
        productName: "Bánh Red Velvet",
        quantity: 1,
        price: 250000,
        imageUrl: "https://loremflickr.com/150/150?lock=1",
        selectedSize: "16cm",
        selectedFlavor: "Truyền thống",
        customMessage: "Chúc mừng sinh nhật con yêu",
        candles: 5,
      },
      {
        cartItemId: "6|default|default||0",
        productId: "6",
        productName: "Croissant Bơ",
        quantity: 3,
        price: 45000,
        imageUrl: "https://loremflickr.com/150/150?lock=6",
      },
    ],
    totalAmount: 385000,
    orderType: "delivery",
    status: "pending",
    deliveryAddress: "123 Lê Lợi, Quận 1, TP.HCM",
    notes: "Giao trước 10h sáng",
    createdAt: new Date("2026-06-17T08:30:00"),
    updatedAt: new Date("2026-06-17T08:30:00"),
  },
  {
    id: "ORD002",
    orderNumber: "DH-2026-002",
    customerName: "Trần Thị Bình",
    customerPhone: "0912345678",
    items: [
      {
        cartItemId: "4|medium|classic|Happy Anniversary|25",
        productId: "4",
        productName: "Bánh Tiramisu",
        quantity: 1,
        price: 380000,
        imageUrl: "https://loremflickr.com/150/150?lock=4",
        selectedSize: "Vừa (6-8 người)",
        selectedFlavor: "Cổ điển",
        customMessage: "Happy Anniversary",
        candles: 25,
      },
    ],
    totalAmount: 380000,
    orderType: "pickup",
    status: "processing",
    pickupTime: "2026-06-17T15:00:00",
    createdAt: new Date("2026-06-17T07:15:00"),
    updatedAt: new Date("2026-06-17T09:00:00"),
  },
  {
    id: "ORD003",
    orderNumber: "DH-2026-003",
    customerName: "Lê Minh Châu",
    customerPhone: "0923456789",
    customerEmail: "leminhchau@email.com",
    items: [
      {
        cartItemId: "2|20cm|milk|Chúc bé yêu thật nhiều niềm vui|3",
        productId: "2",
        productName: "Bánh Chocolate",
        quantity: 1,
        price: 250000,
        imageUrl: "https://loremflickr.com/150/150?lock=2",
        selectedSize: "20cm",
        selectedFlavor: "Sô-cô-la sữa",
        customMessage: "Chúc bé yêu thật nhiều niềm vui",
        candles: 3,
      },
      {
        cartItemId: "8|default|default||0",
        productId: "8",
        productName: "Matcha Latte",
        quantity: 2,
        price: 65000,
        imageUrl: "https://loremflickr.com/150/150?lock=8",
      },
    ],
    totalAmount: 380000,
    orderType: "delivery",
    status: "completed",
    deliveryAddress: "456 Nguyễn Huệ, Quận 1, TP.HCM",
    createdAt: new Date("2026-06-16T14:20:00"),
    updatedAt: new Date("2026-06-16T16:30:00"),
  },
  {
    id: "ORD004",
    orderNumber: "DH-2026-004",
    customerName: "Phạm Quốc Dũng",
    customerPhone: "0934567890",
    items: [
      {
        cartItemId: "1|24cm|cheese|Congratulations on your promotion!|0",
        productId: "1",
        productName: "Bánh Red Velvet",
        quantity: 1,
        price: 350000,
        imageUrl: "https://loremflickr.com/150/150?lock=1",
        selectedSize: "24cm",
        selectedFlavor: "Cream cheese",
        customMessage: "Congratulations on your promotion!",
      },
    ],
    totalAmount: 350000,
    orderType: "preorder",
    status: "pending",
    pickupTime: "2026-06-18T10:00:00",
    notes: "Đặt trước, lấy ngày mai",
    createdAt: new Date("2026-06-17T10:45:00"),
    updatedAt: new Date("2026-06-17T10:45:00"),
  },
  {
    id: "ORD005",
    orderNumber: "DH-2026-005",
    customerName: "Hoàng Thu Hằng",
    customerPhone: "0945678901",
    customerEmail: "hoangthuhang@email.com",
    items: [
      {
        cartItemId: "7|default|default||0",
        productId: "7",
        productName: "Bánh Mì Sandwich",
        quantity: 5,
        price: 55000,
        imageUrl: "https://loremflickr.com/150/150?lock=7",
      },
      {
        cartItemId: "6|default|default||0",
        productId: "6",
        productName: "Croissant Bơ",
        quantity: 5,
        price: 45000,
        imageUrl: "https://loremflickr.com/150/150?lock=6",
      },
    ],
    totalAmount: 500000,
    orderType: "pickup",
    status: "processing",
    pickupTime: "2026-06-17T12:30:00",
    notes: "Đặt cho buổi họp công ty",
    createdAt: new Date("2026-06-17T08:00:00"),
    updatedAt: new Date("2026-06-17T08:15:00"),
  },
  {
    id: "ORD006",
    orderNumber: "DH-2026-006",
    customerName: "Võ Thành Long",
    customerPhone: "0956789012",
    items: [
      {
        cartItemId: "4|large|mocha|Best wishes for your new journey|0",
        productId: "4",
        productName: "Bánh Tiramisu",
        quantity: 1,
        price: 450000,
        imageUrl: "https://loremflickr.com/150/150?lock=4",
        selectedSize: "Lớn (10-12 người)",
        selectedFlavor: "Mocha",
        customMessage: "Best wishes for your new journey",
      },
    ],
    totalAmount: 450000,
    orderType: "delivery",
    status: "pending",
    deliveryAddress: "789 Võ Văn Tần, Quận 3, TP.HCM",
    createdAt: new Date("2026-06-17T11:20:00"),
    updatedAt: new Date("2026-06-17T11:20:00"),
  },
  {
    id: "ORD007",
    orderNumber: "DH-2026-007",
    customerName: "Đặng Minh Tuấn",
    customerPhone: "0967890123",
    customerEmail: "dangminhtuan@email.com",
    items: [
      {
        cartItemId: "3|default|default|Chúc mừng khai trương|0",
        productId: "3",
        productName: "Bánh Vanilla",
        quantity: 2,
        price: 180000,
        imageUrl: "https://loremflickr.com/150/150?lock=3",
        customMessage: "Chúc mừng khai trương",
      },
    ],
    totalAmount: 360000,
    orderType: "delivery",
    status: "completed",
    deliveryAddress: "321 Hai Bà Trưng, Quận 3, TP.HCM",
    createdAt: new Date("2026-06-16T09:00:00"),
    updatedAt: new Date("2026-06-16T11:00:00"),
  },
  {
    id: "ORD008",
    orderNumber: "DH-2026-008",
    customerName: "Bùi Thị Mai",
    customerPhone: "0978901234",
    items: [
      {
        cartItemId: "2|16cm|dark|Happy Birthday Dad|60",
        productId: "2",
        productName: "Bánh Chocolate",
        quantity: 1,
        price: 200000,
        imageUrl: "https://loremflickr.com/150/150?lock=2",
        selectedSize: "16cm",
        selectedFlavor: "Sô-cô-la đen",
        customMessage: "Happy Birthday Dad",
        candles: 60,
      },
    ],
    totalAmount: 200000,
    orderType: "pickup",
    status: "completed",
    pickupTime: "2026-06-16T18:00:00",
    createdAt: new Date("2026-06-16T15:30:00"),
    updatedAt: new Date("2026-06-16T18:00:00"),
  },
];
