import { prisma } from "./prisma";
import type {
  Product,
  Category,
  Order,
  OrderStatus,
  SizeOption,
  FlavorOption,
  BranchStock,
} from "@/types";

// Helper to parse JSON fields
function parseJsonArray<T>(value: string | null | undefined): T[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : undefined;
  } catch {
    return undefined;
  }
}

function stringifyJsonArray<T>(value: T[] | undefined | null) {
  if (value === undefined) return undefined;
  if (!value || value.length === 0) return null;
  return JSON.stringify(value);
}

function parseProduct(product: any): Product {
  return {
    ...product,
    sizeOptions: parseJsonArray<SizeOption>(product.sizeOptions),
    flavorOptions: parseJsonArray<FlavorOption>(product.flavorOptions),
    tags: parseJsonArray<string>(product.tags),
    occasionTags: parseJsonArray<string>(product.occasionTags),
    dietaryTags: parseJsonArray<string>(product.dietaryTags),
    allergens: parseJsonArray<string>(product.allergens),
    searchKeywords: parseJsonArray<string>(product.searchKeywords),
    galleryImages: parseJsonArray<string>(product.galleryImages),
    pickupBranchIds: parseJsonArray<string>(product.pickupBranchIds),
    branchStock: parseJsonArray<BranchStock>(product.branchStock),
  };
}

function parseOrder(order: any): Order {
  const normalizedStatus = normalizeOrderStatus(order.status);
  const normalizedType = normalizeOrderType(order.orderType);
  return {
    ...order,
    items: JSON.parse(order.items),
    orderType: normalizedType,
    status: normalizedStatus,
    paymentStatus: normalizePaymentStatus(order.paymentStatus),
    pickupTime: order.pickupTime ? order.pickupTime.toISOString() : undefined,
    statusHistory: order.statusHistory
      ? JSON.parse(order.statusHistory)
      : [
          {
            status: normalizedStatus,
            at: order.createdAt.toISOString(),
            actor: "system",
          },
        ],
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

const validOrderStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "processing",
  "completed",
  "delivered",
  "cancelled",
] as const;

const allowedStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "processing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["delivered", "completed", "cancelled"],
  processing: ["completed", "delivered", "cancelled"],
  completed: [],
  delivered: [],
  cancelled: [],
};

function normalizeOrderStatus(value: unknown): OrderStatus {
  const normalized = String(value ?? "pending").toLowerCase();
  return validOrderStatuses.includes(normalized as OrderStatus)
    ? (normalized as OrderStatus)
    : "pending";
}

function normalizeOrderType(value: unknown): Order["orderType"] {
  const normalized = String(value ?? "delivery").toLowerCase();
  if (normalized === "pickup" || normalized === "preorder") return normalized;
  return "delivery";
}

function normalizePaymentStatus(value: unknown): Order["paymentStatus"] {
  const normalized = String(value ?? "unpaid").toLowerCase();
  if (normalized === "paid" || normalized === "refunded") return normalized;
  return "unpaid";
}

function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus) {
  return from === to || allowedStatusTransitions[from]?.includes(to);
}

// Categories
export async function getCategories(): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      products: {
        select: {
          id: true,
          isAvailable: true,
          stock: true,
        },
      },
    },
  });
  return categories.map((cat) => ({
    ...cat,
    productCount: cat.products.length,
    activeProductCount: cat.products.filter((product) => product.isAvailable)
      .length,
    outOfStockProductCount: cat.products.filter((product) => product.stock <= 0)
      .length,
    products: undefined,
  })) as any;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({
    where: { id },
  });
  return category;
}

export async function createCategory(data: {
  name: string;
  iconUrl: string;
  displayOrder?: number;
  isVisible?: boolean;
}): Promise<Category> {
  const category = await prisma.category.create({
    data,
  });
  return category;
}

export async function updateCategory(
  id: string,
  data: Partial<{
    name: string;
    iconUrl: string;
    displayOrder: number;
    isVisible: boolean;
  }>,
): Promise<Category> {
  const category = await prisma.category.update({
    where: { id },
    data,
  });
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  const productCount = await prisma.product.count({
    where: { categoryId: id },
  });

  if (productCount > 0) {
    throw new Error("CATEGORY_HAS_PRODUCTS");
  }

  await prisma.category.delete({
    where: { id },
  });
}

export async function reorderCategories(
  items: Array<{ id: string; displayOrder: number }>,
): Promise<void> {
  await prisma.$transaction(
    items.map((item) =>
      prisma.category.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );
}

export async function moveCategoryProducts(
  fromCategoryId: string,
  toCategoryId: string,
): Promise<number> {
  const result = await prisma.product.updateMany({
    where: { categoryId: fromCategoryId },
    data: { categoryId: toCategoryId },
  });

  return result.count;
}

// Products
export async function getProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { isAvailable: true },
    include: { category: true },
  });
  return products.map(parseProduct);
}

// Get all products (including unavailable ones for admin)
export async function getAllProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    include: { category: true },
  });
  return products.map(parseProduct);
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { categoryId, isAvailable: true },
    include: { category: true },
  });
  return products.map(parseProduct);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { isFeatured: true, isAvailable: true },
    include: { category: true },
  });
  return products.map(parseProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { id, isAvailable: true },
    include: { category: true },
  });
  return product ? parseProduct(product) : null;
}

export async function getProductByIdAdmin(id: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  return product ? parseProduct(product) : null;
}

export async function createProduct(data: {
  name: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  description?: string;
  availableForDelivery?: boolean;
  availableForPickup?: boolean;
  requiresMessage?: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  stock?: number;
  isAvailable?: boolean;
  sizeOptions?: SizeOption[];
  flavorOptions?: FlavorOption[];
  tags?: string[];
  occasionTags?: string[];
  dietaryTags?: string[];
  allergens?: string[];
  searchKeywords?: string[];
  galleryImages?: string[];
  pickupBranchIds?: string[];
  branchStock?: BranchStock[];
  preparationTimeMinutes?: number;
  requiresPreorder?: boolean;
  preorderMinHours?: number;
  availableToday?: boolean;
  sortPriority?: number;
}): Promise<Product> {
  const product = await prisma.product.create({
    data: {
      ...data,
      sizeOptions: stringifyJsonArray(data.sizeOptions),
      flavorOptions: stringifyJsonArray(data.flavorOptions),
      tags: stringifyJsonArray(data.tags),
      occasionTags: stringifyJsonArray(data.occasionTags),
      dietaryTags: stringifyJsonArray(data.dietaryTags),
      allergens: stringifyJsonArray(data.allergens),
      searchKeywords: stringifyJsonArray(data.searchKeywords),
      galleryImages: stringifyJsonArray(data.galleryImages),
      pickupBranchIds: stringifyJsonArray(data.pickupBranchIds),
      branchStock: stringifyJsonArray(data.branchStock),
    },
    include: { category: true },
  });
  return parseProduct(product);
}

export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    price: number;
    imageUrl: string;
    categoryId: string;
    description?: string;
    availableForDelivery?: boolean;
    availableForPickup?: boolean;
    requiresMessage?: boolean;
    isFeatured?: boolean;
    isNew?: boolean;
    isBestseller?: boolean;
    stock?: number;
    isAvailable?: boolean;
    sizeOptions?: SizeOption[];
    flavorOptions?: FlavorOption[];
    tags?: string[];
    occasionTags?: string[];
    dietaryTags?: string[];
    allergens?: string[];
    searchKeywords?: string[];
    galleryImages?: string[];
    pickupBranchIds?: string[];
    branchStock?: BranchStock[];
    preparationTimeMinutes?: number;
    requiresPreorder?: boolean;
    preorderMinHours?: number;
    availableToday?: boolean;
    sortPriority?: number;
  }>,
): Promise<Product> {
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...data,
      sizeOptions: stringifyJsonArray(data.sizeOptions),
      flavorOptions: stringifyJsonArray(data.flavorOptions),
      tags: stringifyJsonArray(data.tags),
      occasionTags: stringifyJsonArray(data.occasionTags),
      dietaryTags: stringifyJsonArray(data.dietaryTags),
      allergens: stringifyJsonArray(data.allergens),
      searchKeywords: stringifyJsonArray(data.searchKeywords),
      galleryImages: stringifyJsonArray(data.galleryImages),
      pickupBranchIds: stringifyJsonArray(data.pickupBranchIds),
      branchStock: stringifyJsonArray(data.branchStock),
    },
    include: { category: true },
  });
  return parseProduct(product);
}

export async function deleteProduct(id: string): Promise<void> {
  console.log("deleteProduct called with id:", id);
  try {
    // First check if product exists
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      console.log("Product not found with id:", id);
      throw new Error("Product not found");
    }
    console.log("Product found, deleting:", product.name);
    await prisma.product.delete({ where: { id } });
    console.log("Product deleted successfully!");
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    throw error;
  }
}

// Orders
export async function createOrder(data: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalAmount: number;
  orderType: string;
  status?: string;
  paymentStatus?: string;
  deliveryAddress?: string;
  pickupTime?: Date;
  notes?: string;
  internalNotes?: string;
  assignedTo?: string;
  deliveryFee?: number;
  discountAmount?: number;
  items: any[];
}): Promise<Order> {
  const status = normalizeOrderStatus(data.status);
  const order = await prisma.order.create({
    data: {
      ...data,
      orderType: normalizeOrderType(data.orderType),
      status,
      paymentStatus: normalizePaymentStatus(data.paymentStatus),
      pickupTime: data.pickupTime ? new Date(data.pickupTime) : null,
      items: JSON.stringify(data.items),
      statusHistory: JSON.stringify([
        {
          status,
          at: new Date().toISOString(),
          actor: "system",
          note: "Đơn được tạo",
        },
      ]),
    },
  });
  return parseOrder(order);
}

export async function getOrders(): Promise<Order[]> {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });
  return orders.map(parseOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({ where: { id } });
  return order ? parseOrder(order) : null;
}

export async function updateOrderStatus(
  id: string,
  status: string,
  metadata: { note?: string; actor?: string } = {},
): Promise<Order> {
  const currentOrder = await prisma.order.findUnique({ where: { id } });

  if (!currentOrder) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const currentStatus = normalizeOrderStatus(currentOrder.status);
  const nextStatus = normalizeOrderStatus(status);

  if (!canTransitionOrderStatus(currentStatus, nextStatus)) {
    throw new Error("INVALID_STATUS_TRANSITION");
  }

  const history = currentOrder.statusHistory
    ? JSON.parse(currentOrder.statusHistory)
    : [];

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: nextStatus,
      statusHistory: JSON.stringify([
        ...history,
        {
          status: nextStatus,
          at: new Date().toISOString(),
          actor: metadata.actor ?? "admin",
          note: metadata.note,
        },
      ]),
    },
  });
  return parseOrder(order);
}

export async function updateOrder(
  id: string,
  data: Partial<{
    status: string;
    paymentStatus: string;
    internalNotes: string;
    cancelReason: string;
    assignedTo: string;
    pickupTime: string;
    deliveryAddress: string;
  }>,
): Promise<Order> {
  let baseOrder: Order | null = null;

  if (data.status !== undefined) {
    baseOrder = await updateOrderStatus(id, data.status, {
      note: data.cancelReason,
      actor: "admin",
    });
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      paymentStatus:
        data.paymentStatus !== undefined
          ? normalizePaymentStatus(data.paymentStatus)
          : undefined,
      internalNotes: data.internalNotes,
      cancelReason: data.cancelReason,
      assignedTo: data.assignedTo,
      pickupTime: data.pickupTime ? new Date(data.pickupTime) : undefined,
      deliveryAddress: data.deliveryAddress,
    },
  });

  return parseOrder(order ?? baseOrder);
}

// Helper to generate order number
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BK${year}${month}${day}${random}`;
}
