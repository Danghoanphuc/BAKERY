import type {
  CartItem,
  Category,
  Customer,
  CustomerMagicLink,
  CustomerPersonalization,
  Order,
  OrderType,
  Product,
} from "@/types";

type FirestoreDateValue =
  | Date
  | string
  | number
  | { seconds: number; nanoseconds?: number; toDate?: () => Date }
  | undefined
  | null;

type FirestoreDocument = Record<string, unknown>;

function toDate(value: FirestoreDateValue): Date | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      return value.toDate();
    }

    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000);
    }
  }

  return undefined;
}

export function normalizeCategory(
  id: string,
  data: FirestoreDocument,
): Category {
  return {
    id,
    name: String(data.name ?? ""),
    iconUrl: String(data.iconUrl ?? ""),
    displayOrder:
      typeof data.displayOrder === "number" ? data.displayOrder : undefined,
  };
}

export function normalizeProduct(id: string, data: FirestoreDocument): Product {
  return {
    id,
    name: String(data.name ?? ""),
    price: typeof data.price === "number" ? data.price : 0,
    imageUrl: String(data.imageUrl ?? ""),
    categoryId: String(data.categoryId ?? ""),
    description:
      typeof data.description === "string" ? data.description : undefined,
    availableForDelivery:
      typeof data.availableForDelivery === "boolean"
        ? data.availableForDelivery
        : undefined,
    availableForPickup:
      typeof data.availableForPickup === "boolean"
        ? data.availableForPickup
        : undefined,
    stock: typeof data.stock === "number" ? data.stock : undefined,
    isAvailable:
      typeof data.isAvailable === "boolean" ? data.isAvailable : undefined,
    sizeOptions: Array.isArray(data.sizeOptions)
      ? (data.sizeOptions as Product["sizeOptions"])
      : undefined,
    flavorOptions: Array.isArray(data.flavorOptions)
      ? (data.flavorOptions as Product["flavorOptions"])
      : undefined,
    requiresMessage:
      typeof data.requiresMessage === "boolean"
        ? data.requiresMessage
        : undefined,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : undefined,
    occasionTags: Array.isArray(data.occasionTags)
      ? (data.occasionTags as string[])
      : undefined,
    dietaryTags: Array.isArray(data.dietaryTags)
      ? (data.dietaryTags as string[])
      : undefined,
    allergens: Array.isArray(data.allergens)
      ? (data.allergens as string[])
      : undefined,
    searchKeywords: Array.isArray(data.searchKeywords)
      ? (data.searchKeywords as string[])
      : undefined,
    galleryImages: Array.isArray(data.galleryImages)
      ? (data.galleryImages as string[])
      : undefined,
    pickupBranchIds: Array.isArray(data.pickupBranchIds)
      ? (data.pickupBranchIds as string[])
      : undefined,
    branchStock: Array.isArray(data.branchStock)
      ? (data.branchStock as Product["branchStock"])
      : undefined,
    preparationTimeMinutes:
      typeof data.preparationTimeMinutes === "number"
        ? data.preparationTimeMinutes
        : undefined,
    requiresPreorder:
      typeof data.requiresPreorder === "boolean"
        ? data.requiresPreorder
        : undefined,
    preorderMinHours:
      typeof data.preorderMinHours === "number"
        ? data.preorderMinHours
        : undefined,
    availableToday:
      typeof data.availableToday === "boolean" ? data.availableToday : undefined,
    sortPriority:
      typeof data.sortPriority === "number" ? data.sortPriority : undefined,
    isFeatured:
      typeof data.isFeatured === "boolean" ? data.isFeatured : undefined,
    isNew: typeof data.isNew === "boolean" ? data.isNew : undefined,
    isBestseller:
      typeof data.isBestseller === "boolean" ? data.isBestseller : undefined,
    createdAt: toDate(data.createdAt as FirestoreDateValue),
    updatedAt: toDate(data.updatedAt as FirestoreDateValue),
  };
}

function normalizeCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];
  return items as CartItem[];
}

export function normalizeOrder(id: string, data: FirestoreDocument): Order {
  const createdAt = toDate(data.createdAt as FirestoreDateValue) ?? new Date();
  const updatedAt = toDate(data.updatedAt as FirestoreDateValue) ?? createdAt;

  return {
    id,
    orderNumber: String(data.orderNumber ?? ""),
    customerName: String(data.customerName ?? ""),
    customerPhone: String(data.customerPhone ?? ""),
    customerEmail:
      typeof data.customerEmail === "string" ? data.customerEmail : undefined,
    items: normalizeCartItems(data.items),
    totalAmount: typeof data.totalAmount === "number" ? data.totalAmount : 0,
    orderType: (typeof data.orderType === "string"
      ? data.orderType
      : "delivery") as OrderType,
    status: (typeof data.status === "string"
      ? data.status
      : "pending") as Order["status"],
    deliveryAddress:
      typeof data.deliveryAddress === "string"
        ? data.deliveryAddress
        : undefined,
    pickupTime:
      typeof data.pickupTime === "string" ? data.pickupTime : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    createdAt,
    updatedAt,
  };
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeCustomerPersonalization(
  value: unknown,
): CustomerPersonalization {
  if (!value || typeof value !== "object") return {};
  const data = value as FirestoreDocument;

  return {
    birthday: typeof data.birthday === "string" ? data.birthday : undefined,
    favoriteFlavors: normalizeStringArray(data.favoriteFlavors),
    favoriteProducts: normalizeStringArray(data.favoriteProducts),
    dietaryNotes:
      typeof data.dietaryNotes === "string" ? data.dietaryNotes : undefined,
    defaultDeliveryAddress:
      typeof data.defaultDeliveryAddress === "string"
        ? data.defaultDeliveryAddress
        : undefined,
    specialOccasions:
      typeof data.specialOccasions === "string"
        ? data.specialOccasions
        : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
  };
}

export function normalizeCustomer(
  id: string,
  data: FirestoreDocument,
): Customer {
  const createdAt = toDate(data.createdAt as FirestoreDateValue) ?? new Date();
  const updatedAt = toDate(data.updatedAt as FirestoreDateValue) ?? createdAt;

  return {
    id,
    name: String(data.name ?? ""),
    phone: String(data.phone ?? ""),
    email: typeof data.email === "string" ? data.email : undefined,
    status:
      data.status === "active" || data.status === "paused"
        ? data.status
        : "invited",
    loyaltyPoints:
      typeof data.loyaltyPoints === "number" ? data.loyaltyPoints : 0,
    tier:
      data.tier === "silver" || data.tier === "gold" || data.tier === "vip"
        ? data.tier
        : "new",
    currentMagicLinkToken:
      typeof data.currentMagicLinkToken === "string"
        ? data.currentMagicLinkToken
        : undefined,
    magicLinkExpiresAt: toDate(data.magicLinkExpiresAt as FirestoreDateValue),
    inviteSentAt: toDate(data.inviteSentAt as FirestoreDateValue),
    lastOrderAt: toDate(data.lastOrderAt as FirestoreDateValue),
    lastLoginAt: toDate(data.lastLoginAt as FirestoreDateValue),
    zaloUserId: typeof data.zaloUserId === "string" ? data.zaloUserId : undefined,
    personalization: normalizeCustomerPersonalization(data.personalization),
    createdAt,
    updatedAt,
  };
}

export function normalizeMagicLink(
  id: string,
  data: FirestoreDocument,
): CustomerMagicLink {
  const createdAt = toDate(data.createdAt as FirestoreDateValue) ?? new Date();
  const updatedAt = toDate(data.updatedAt as FirestoreDateValue) ?? createdAt;

  return {
    id,
    token: String(data.token ?? ""),
    customerId: String(data.customerId ?? ""),
    expiresAt: toDate(data.expiresAt as FirestoreDateValue) ?? createdAt,
    isUsed: typeof data.isUsed === "boolean" ? data.isUsed : false,
    usedAt: toDate(data.usedAt as FirestoreDateValue),
    firstUserAgent:
      typeof data.firstUserAgent === "string" ? data.firstUserAgent : undefined,
    firstIpHash: typeof data.firstIpHash === "string" ? data.firstIpHash : undefined,
    createdAt,
    updatedAt,
  };
}
