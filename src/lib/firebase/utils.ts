import type {
  CartItem,
  Category,
  Customer,
  CustomerAddressBookEntry,
  CustomerCareLog,
  CustomerMagicLink,
  CustomerPersonalization,
  CustomerPointAdjustment,
  CustomerVoucherIssue,
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

/**
 * Serialize object to plain JSON-safe format for passing to Client Components
 * Converts Date objects to ISO strings to avoid Next.js serialization errors
 */
export function serializeForClient<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeForClient(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeForClient(value);
    }
    return serialized as T;
  }

  return obj;
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
    sellingPoints: Array.isArray(data.sellingPoints)
      ? (data.sellingPoints as string[])
      : undefined,
    servingSuggestion:
      typeof data.servingSuggestion === "string"
        ? data.servingSuggestion
        : undefined,
    ingredients: Array.isArray(data.ingredients)
      ? (data.ingredients as string[])
      : undefined,
    shelfLife: typeof data.shelfLife === "string" ? data.shelfLife : undefined,
    storage: typeof data.storage === "string" ? data.storage : undefined,
    saleArea: Array.isArray(data.saleArea)
      ? (data.saleArea as string[])
      : undefined,
    ingredientsCost:
      typeof data.ingredientsCost === "number" ? data.ingredientsCost : undefined,
    packagingCost:
      typeof data.packagingCost === "number" ? data.packagingCost : undefined,
    laborCost: typeof data.laborCost === "number" ? data.laborCost : undefined,
    overheadCost:
      typeof data.overheadCost === "number" ? data.overheadCost : undefined,
    wastePercent:
      typeof data.wastePercent === "number" ? data.wastePercent : undefined,
    targetGrossMarginPercent:
      typeof data.targetGrossMarginPercent === "number"
        ? data.targetGrossMarginPercent
        : undefined,
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
    nutrition:
      data.nutrition && typeof data.nutrition === "object"
        ? (data.nutrition as Product["nutrition"])
        : undefined,
    social:
      data.social && typeof data.social === "object"
        ? (data.social as Product["social"])
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
      typeof data.availableToday === "boolean"
        ? data.availableToday
        : undefined,
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
    paymentStatus:
      data.paymentStatus === "paid" ||
      data.paymentStatus === "pending" ||
      data.paymentStatus === "refunded"
        ? data.paymentStatus
        : "unpaid",
    paymentMethod:
      typeof data.paymentMethod === "string"
        ? (data.paymentMethod as Order["paymentMethod"])
        : undefined,
    paidAt: toDate(data.paidAt as FirestoreDateValue),
    payosOrderCode:
      typeof data.payosOrderCode === "number" ? data.payosOrderCode : undefined,
    payosPaymentLinkId:
      typeof data.payosPaymentLinkId === "string"
        ? data.payosPaymentLinkId
        : undefined,
    payosCheckoutUrl:
      typeof data.payosCheckoutUrl === "string" ? data.payosCheckoutUrl : undefined,
    payosQrCode:
      typeof data.payosQrCode === "string" ? data.payosQrCode : undefined,
    payosReference:
      typeof data.payosReference === "string" ? data.payosReference : undefined,
    payosTransactionDateTime:
      typeof data.payosTransactionDateTime === "string"
        ? data.payosTransactionDateTime
        : undefined,
    payosStockDeducted:
      typeof data.payosStockDeducted === "boolean"
        ? data.payosStockDeducted
        : undefined,
    salesChannel:
      typeof data.salesChannel === "string"
        ? (data.salesChannel as Order["salesChannel"])
        : undefined,
    deliveryAddress:
      typeof data.deliveryAddress === "string"
        ? data.deliveryAddress
        : undefined,
    pickupTime:
      typeof data.pickupTime === "string" ? data.pickupTime : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    internalNotes:
      typeof data.internalNotes === "string" ? data.internalNotes : undefined,
    cancelReason:
      typeof data.cancelReason === "string" ? data.cancelReason : undefined,
    assignedTo: typeof data.assignedTo === "string" ? data.assignedTo : undefined,
    deliveryFee:
      typeof data.deliveryFee === "number" ? data.deliveryFee : undefined,
    discountAmount:
      typeof data.discountAmount === "number" ? data.discountAmount : undefined,
    productSubtotal:
      typeof data.productSubtotal === "number" ? data.productSubtotal : undefined,
    estimatedCostOfGoods:
      typeof data.estimatedCostOfGoods === "number"
        ? data.estimatedCostOfGoods
        : undefined,
    estimatedGrossProfit:
      typeof data.estimatedGrossProfit === "number"
        ? data.estimatedGrossProfit
        : undefined,
    loyaltyPointsEarned:
      typeof data.loyaltyPointsEarned === "number"
        ? data.loyaltyPointsEarned
        : undefined,
    voucherCode:
      typeof data.voucherCode === "string" ? data.voucherCode : undefined,
    voucherId: typeof data.voucherId === "string" ? data.voucherId : undefined,
    voucherUseMode:
      typeof data.voucherUseMode === "string"
        ? (data.voucherUseMode as Order["voucherUseMode"])
        : undefined,
    statusHistory: Array.isArray(data.statusHistory)
      ? (data.statusHistory as Order["statusHistory"])
      : undefined,
    createdAt,
    updatedAt,
  };
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeAddressBook(value: unknown): CustomerAddressBookEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const addresses = value
    .filter((item): item is FirestoreDocument => Boolean(item) && typeof item === "object")
    .map((item, index): CustomerAddressBookEntry | null => {
      const formattedAddress = normalizeOptionalString(item.formattedAddress);
      const street = normalizeOptionalString(item.street);
      const district = normalizeOptionalString(item.district) ?? "";
      const city = normalizeOptionalString(item.city) ?? "";
      const addressText =
        formattedAddress ||
        [street, district, city].filter(Boolean).join(", ");

      if (!addressText) return null;

      return {
        id: normalizeOptionalString(item.id) ?? `address-${index}`,
        label: normalizeOptionalString(item.label) ?? "Địa chỉ",
        recipientName: normalizeOptionalString(item.recipientName),
        recipientPhone: normalizeOptionalString(item.recipientPhone),
        street: street ?? addressText,
        district,
        city,
        formattedAddress: formattedAddress ?? addressText,
        lat: normalizeOptionalNumber(item.lat),
        lng: normalizeOptionalNumber(item.lng),
        placeId: normalizeOptionalString(item.placeId),
        note: normalizeOptionalString(item.note),
        isDefault: item.isDefault === true,
        createdAt: normalizeOptionalString(item.createdAt),
        updatedAt: normalizeOptionalString(item.updatedAt),
      };
    })
    .filter((item): item is CustomerAddressBookEntry => Boolean(item));

  if (addresses.length === 0) return [];
  const defaultIndex = addresses.findIndex((address) => address.isDefault);

  return addresses.map((address, index) => ({
    ...address,
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
  }));
}

function normalizeCareLogs(value: unknown): CustomerCareLog[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      type:
        item.type === "call" ||
        item.type === "note" ||
        item.type === "phone_verified" ||
        item.type === "risk" ||
        item.type === "voucher" ||
        item.type === "points"
          ? item.type
          : "note",
      title: String(item.title ?? ""),
      note: typeof item.note === "string" ? item.note : undefined,
      outcome:
        item.outcome === "confirmed" ||
        item.outcome === "no_answer" ||
        item.outcome === "wrong_number" ||
        item.outcome === "callback" ||
        item.outcome === "note"
          ? item.outcome
          : undefined,
      actor: typeof item.actor === "string" ? item.actor : undefined,
      createdAt: toDate(item.createdAt as FirestoreDateValue) ?? new Date(),
    }));
}

function normalizePointAdjustments(value: unknown): CustomerPointAdjustment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      points: typeof item.points === "number" ? item.points : 0,
      reason: String(item.reason ?? ""),
      actor: typeof item.actor === "string" ? item.actor : undefined,
      createdAt: toDate(item.createdAt as FirestoreDateValue) ?? new Date(),
    }));
}

function normalizeVoucherIssues(value: unknown): CustomerVoucherIssue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      voucherId: typeof item.voucherId === "string" ? item.voucherId : undefined,
      voucherCode: typeof item.voucherCode === "string" ? item.voucherCode : undefined,
      title: String(item.title ?? ""),
      note: typeof item.note === "string" ? item.note : undefined,
      actor: typeof item.actor === "string" ? item.actor : undefined,
      createdAt: toDate(item.createdAt as FirestoreDateValue) ?? new Date(),
    }));
}

function normalizeCustomerPersonalization(
  value: unknown,
): CustomerPersonalization {
  if (!value || typeof value !== "object") return {};
  const data = value as FirestoreDocument;
  const addressBook = normalizeAddressBook(data.addressBook);
  const defaultAddress =
    normalizeOptionalString(data.defaultDeliveryAddress) ||
    addressBook?.find((address) => address.isDefault)?.formattedAddress ||
    addressBook?.[0]?.formattedAddress;

  return {
    birthday: typeof data.birthday === "string" ? data.birthday : undefined,
    favoriteFlavors: normalizeStringArray(data.favoriteFlavors),
    favoriteProducts: normalizeStringArray(data.favoriteProducts),
    dietaryNotes:
      typeof data.dietaryNotes === "string" ? data.dietaryNotes : undefined,
    defaultDeliveryAddress: defaultAddress,
    addressBook,
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
    birthday: typeof data.birthday === "string" ? data.birthday : undefined,
    gender:
      data.gender === "male" || data.gender === "female" || data.gender === "other"
        ? data.gender
        : undefined,
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
    phoneVerifiedAt: toDate(data.phoneVerifiedAt as FirestoreDateValue),
    phoneVerificationMethod:
      data.phoneVerificationMethod === "admin" ||
      data.phoneVerificationMethod === "zalo"
        ? data.phoneVerificationMethod
        : undefined,
    phoneVerificationNote:
      typeof data.phoneVerificationNote === "string"
        ? data.phoneVerificationNote
        : undefined,
    zaloUserId:
      typeof data.zaloUserId === "string" ? data.zaloUserId : undefined,
    hasPassword: typeof data.passwordHash === "string" && data.passwordHash.length > 0,
    passwordSetAt: toDate(data.passwordSetAt as FirestoreDateValue),
    tags: normalizeStringArray(data.tags),
    internalNotes:
      typeof data.internalNotes === "string" ? data.internalNotes : undefined,
    riskLevel:
      data.riskLevel === "green" ||
      data.riskLevel === "yellow" ||
      data.riskLevel === "red"
        ? data.riskLevel
        : undefined,
    riskReason: typeof data.riskReason === "string" ? data.riskReason : undefined,
    preferredChannel:
      data.preferredChannel === "phone" ||
      data.preferredChannel === "zalo" ||
      data.preferredChannel === "sms" ||
      data.preferredChannel === "email"
        ? data.preferredChannel
        : undefined,
    careLogs: normalizeCareLogs(data.careLogs),
    pointAdjustments: normalizePointAdjustments(data.pointAdjustments),
    issuedVouchers: normalizeVoucherIssues(data.issuedVouchers),
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
    firstIpHash:
      typeof data.firstIpHash === "string" ? data.firstIpHash : undefined,
    createdAt,
    updatedAt,
  };
}
