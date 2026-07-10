import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  Customer,
  CustomerAddressBookEntry,
  CustomerInput,
  CustomerMagicLink,
  CustomerPersonalization,
  MagicLinkResult,
} from "@/types";
import { toPublicUrl } from "@/lib/public-url";
import { normalizePhoneInput } from "@/lib/auth/phone";
import { db } from "./config";
import { normalizeCustomer, normalizeMagicLink } from "./utils";

const CUSTOMERS_COLLECTION = "customers";
const MAGIC_LINKS_COLLECTION = "magic_links";
const MAGIC_LINK_TTL_MINUTES = 30;

export type ConsumeMagicLinkResult =
  | { ok: true; customer: Customer }
  | { ok: false; reason: "missing" | "used" | "expired" };

export type CustomerAuthRecord = Customer & {
  passwordHash?: string;
};

function createToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function normalizePhone(phone: string) {
  return normalizePhoneInput(phone);
}

function normalizeOptionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeAddressText(address: CustomerAddressBookEntry) {
  return normalizeOptionalString(address.formattedAddress) ||
    [address.street, address.district, address.city]
      .map((part) => normalizeOptionalString(part))
      .filter(Boolean)
      .join(", ");
}

function normalizeAddressBook(
  addressBook?: CustomerAddressBookEntry[],
): CustomerAddressBookEntry[] {
  if (!Array.isArray(addressBook)) return [];

  const normalized = addressBook
    .map((address, index): CustomerAddressBookEntry | null => {
      const text = normalizeAddressText(address);
      if (!text) return null;

      return {
        id:
          normalizeOptionalString(address.id) ||
          `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        label: normalizeOptionalString(address.label) || "Địa chỉ",
        recipientName: normalizeOptionalString(address.recipientName),
        recipientPhone: normalizeOptionalString(address.recipientPhone),
        street: normalizeOptionalString(address.street) || text,
        district: normalizeOptionalString(address.district) || "",
        city: normalizeOptionalString(address.city) || "",
        formattedAddress: normalizeOptionalString(address.formattedAddress) || text,
        lat: normalizeOptionalNumber(address.lat),
        lng: normalizeOptionalNumber(address.lng),
        placeId: normalizeOptionalString(address.placeId),
        note: normalizeOptionalString(address.note),
        isDefault: Boolean(address.isDefault),
        createdAt: normalizeOptionalString(address.createdAt),
        updatedAt: normalizeOptionalString(address.updatedAt),
      };
    })
    .filter((address): address is CustomerAddressBookEntry => Boolean(address));

  if (normalized.length > 0 && !normalized.some((address) => address.isDefault)) {
    normalized[0] = { ...normalized[0], isDefault: true };
  }

  return normalized.map((address, index) => ({
    ...address,
    isDefault: address.isDefault && index === normalized.findIndex((item) => item.isDefault),
  }));
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefinedDeep(item)]),
    ) as T;
  }

  return value;
}

function normalizePersonalization(
  personalization?: CustomerPersonalization,
): CustomerPersonalization {
  const addressBook = normalizeAddressBook(personalization?.addressBook);
  const defaultAddress =
    normalizeOptionalString(personalization?.defaultDeliveryAddress) ||
    addressBook.find((address) => address.isDefault)?.formattedAddress ||
    addressBook[0]?.formattedAddress;

  return {
    birthday: normalizeOptionalString(personalization?.birthday),
    favoriteFlavors: personalization?.favoriteFlavors ?? [],
    favoriteProducts: personalization?.favoriteProducts ?? [],
    dietaryNotes: normalizeOptionalString(personalization?.dietaryNotes),
    defaultDeliveryAddress: defaultAddress,
    addressBook,
    specialOccasions: normalizeOptionalString(
      personalization?.specialOccasions,
    ),
    notes: normalizeOptionalString(personalization?.notes),
  };
}

function buildCreatePayload(data: CustomerInput) {
  return {
    name: data.name.trim(),
    phone: normalizePhone(data.phone),
    email: normalizeOptionalString(data.email),
    birthday: normalizeOptionalString(data.birthday),
    gender: data.gender,
    status: data.status ?? "invited",
    loyaltyPoints: data.loyaltyPoints ?? 0,
    tier: data.tier ?? "new",
    currentMagicLinkToken: data.currentMagicLinkToken,
    magicLinkExpiresAt: data.magicLinkExpiresAt,
    phoneVerifiedAt: data.phoneVerifiedAt,
    phoneVerificationMethod: data.phoneVerificationMethod,
    phoneVerificationNote: normalizeOptionalString(data.phoneVerificationNote),
    zaloUserId: normalizeOptionalString(data.zaloUserId),
    tags: data.tags ?? [],
    internalNotes: normalizeOptionalString(data.internalNotes),
    riskLevel: data.riskLevel,
    riskReason: normalizeOptionalString(data.riskReason),
    preferredChannel: data.preferredChannel,
    careLogs: data.careLogs ?? [],
    pointAdjustments: data.pointAdjustments ?? [],
    issuedVouchers: data.issuedVouchers ?? [],
    personalization: normalizePersonalization(data.personalization),
  };
}

function buildUpdatePayload(data: Partial<CustomerInput>) {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.phone !== undefined) payload.phone = normalizePhone(data.phone);
  if (data.email !== undefined)
    payload.email = normalizeOptionalString(data.email);
  if (data.birthday !== undefined) {
    payload.birthday = normalizeOptionalString(data.birthday);
  }
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.status !== undefined) payload.status = data.status;
  if (data.loyaltyPoints !== undefined)
    payload.loyaltyPoints = data.loyaltyPoints;
  if (data.tier !== undefined) payload.tier = data.tier;
  if (data.currentMagicLinkToken !== undefined) {
    payload.currentMagicLinkToken = data.currentMagicLinkToken;
  }
  if (data.magicLinkExpiresAt !== undefined) {
    payload.magicLinkExpiresAt = data.magicLinkExpiresAt;
  }
  if (data.phoneVerifiedAt !== undefined) {
    payload.phoneVerifiedAt = data.phoneVerifiedAt;
  }
  if (data.phoneVerificationMethod !== undefined) {
    payload.phoneVerificationMethod = data.phoneVerificationMethod;
  }
  if (data.phoneVerificationNote !== undefined) {
    payload.phoneVerificationNote = normalizeOptionalString(
      data.phoneVerificationNote,
    );
  }
  if (data.zaloUserId !== undefined) {
    payload.zaloUserId = normalizeOptionalString(data.zaloUserId);
  }
  if (data.tags !== undefined) payload.tags = data.tags;
  if (data.internalNotes !== undefined) {
    payload.internalNotes = normalizeOptionalString(data.internalNotes);
  }
  if (data.riskLevel !== undefined) payload.riskLevel = data.riskLevel;
  if (data.riskReason !== undefined) {
    payload.riskReason = normalizeOptionalString(data.riskReason);
  }
  if (data.preferredChannel !== undefined) {
    payload.preferredChannel = data.preferredChannel;
  }
  if (data.careLogs !== undefined) payload.careLogs = data.careLogs;
  if (data.pointAdjustments !== undefined) {
    payload.pointAdjustments = data.pointAdjustments;
  }
  if (data.issuedVouchers !== undefined) {
    payload.issuedVouchers = data.issuedVouchers;
  }
  if (data.personalization !== undefined) {
    payload.personalization = normalizePersonalization(data.personalization);
  }

  return payload;
}

export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const customersQuery = query(customersRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(customersQuery);

    return snapshot.docs.map((customerDoc) =>
      normalizeCustomer(customerDoc.id, customerDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const customerDoc = await getDoc(doc(db, CUSTOMERS_COLLECTION, id));
  return customerDoc.exists()
    ? normalizeCustomer(customerDoc.id, customerDoc.data())
    : null;
}

export async function getCustomerByPhone(
  phone: string,
): Promise<Customer | null> {
  const normalizedPhone = normalizePhone(phone);
  const customerRef = doc(db, CUSTOMERS_COLLECTION, normalizedPhone);
  const customerDoc = await getDoc(customerRef);

  return customerDoc.exists()
    ? normalizeCustomer(customerDoc.id, customerDoc.data())
    : null;
}

export async function getCustomerAuthByPhone(
  phone: string,
): Promise<CustomerAuthRecord | null> {
  const normalizedPhone = normalizePhone(phone);
  const customerRef = doc(db, CUSTOMERS_COLLECTION, normalizedPhone);
  const customerDoc = await getDoc(customerRef);

  if (!customerDoc.exists()) return null;

  const data = customerDoc.data();
  return {
    ...normalizeCustomer(customerDoc.id, data),
    passwordHash:
      typeof data.passwordHash === "string" ? data.passwordHash : undefined,
  };
}

export async function getCustomerByZaloUserId(
  zaloUserId: string,
): Promise<Customer | null> {
  const customersRef = collection(db, CUSTOMERS_COLLECTION);
  const customersQuery = query(
    customersRef,
    where("zaloUserId", "==", zaloUserId),
    limit(1),
  );
  const snapshot = await getDocs(customersQuery);
  const customerDoc = snapshot.docs[0];

  return customerDoc
    ? normalizeCustomer(customerDoc.id, customerDoc.data())
    : null;
}

export async function createCustomer(data: CustomerInput): Promise<Customer> {
  const payload = buildCreatePayload(data);
  const now = new Date();
  const normalizedPhone = normalizePhone(data.phone);
  const customerRef = doc(db, CUSTOMERS_COLLECTION, normalizedPhone);

  // Check if document already exists (double-check to be safe)
  const existingDoc = await getDoc(customerRef);
  if (existingDoc.exists()) {
    throw new Error("Customer with this phone already exists");
  }

  await setDoc(
    customerRef,
    stripUndefinedDeep({
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  return {
    id: normalizedPhone,
    ...payload,
    personalization: payload.personalization,
    createdAt: now,
    updatedAt: now,
  };
}

export async function createOrUpdateCustomerFromPurchase(data: CustomerInput) {
  const existingCustomer = await getCustomerByPhone(data.phone);
  const pointsToAdd =
    typeof data.loyaltyPoints === "number" &&
    Number.isFinite(data.loyaltyPoints)
      ? Math.max(0, Math.floor(data.loyaltyPoints))
      : 0;

  if (!existingCustomer) {
    return createCustomer(data);
  }

  await updateDoc(doc(db, CUSTOMERS_COLLECTION, existingCustomer.id), {
    ...stripUndefinedDeep(
      buildUpdatePayload({
        name: data.name || existingCustomer.name,
        email: data.email ?? existingCustomer.email,
        status: "active",
        zaloUserId: data.zaloUserId ?? existingCustomer.zaloUserId,
        personalization: {
          ...existingCustomer.personalization,
          ...data.personalization,
        },
      }),
    ),
    ...(pointsToAdd > 0 ? { loyaltyPoints: increment(pointsToAdd) } : {}),
    lastOrderAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    ...existingCustomer,
    ...data,
    status: "active" as const,
    loyaltyPoints: existingCustomer.loyaltyPoints + pointsToAdd,
    personalization: {
      ...existingCustomer.personalization,
      ...data.personalization,
    },
  };
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerInput>,
): Promise<void> {
  await updateDoc(
    doc(db, CUSTOMERS_COLLECTION, id),
    stripUndefinedDeep({
      ...buildUpdatePayload(data),
      updatedAt: serverTimestamp(),
    }),
  );
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, CUSTOMERS_COLLECTION, id));
}

export async function awardCustomerLoyaltyPoints(
  customerId: string,
  points: number,
): Promise<void> {
  if (!Number.isFinite(points) || points <= 0) return;

  await updateDoc(doc(db, CUSTOMERS_COLLECTION, customerId), {
    loyaltyPoints: increment(Math.floor(points)),
    lastOrderAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createMagicLinkForCustomer(
  customerId: string,
  ttlMinutes = MAGIC_LINK_TTL_MINUTES,
): Promise<MagicLinkResult> {
  const customer = await getCustomerById(customerId);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const token = createToken();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await addDoc(
    collection(db, MAGIC_LINKS_COLLECTION),
    stripUndefinedDeep({
      token,
      customerId,
      expiresAt,
      isUsed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  await updateDoc(
    doc(db, CUSTOMERS_COLLECTION, customerId),
    stripUndefinedDeep({
      currentMagicLinkToken: token,
      magicLinkExpiresAt: expiresAt,
      inviteSentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  return {
    customer: {
      ...customer,
      currentMagicLinkToken: token,
      magicLinkExpiresAt: expiresAt,
      inviteSentAt: new Date(),
    },
    token,
    urlPath: `/auth/magic?token=${token}`,
    expiresAt,
  };
}

export function buildMagicLinkUrl(urlPath: string) {
  return toPublicUrl(urlPath);
}

export async function createCustomerWithMagicLink(
  data: CustomerInput,
): Promise<MagicLinkResult> {
  const customer = await createCustomer(data);
  return createMagicLinkForCustomer(customer.id);
}

async function getMagicLinkByToken(
  token: string,
): Promise<CustomerMagicLink | null> {
  const linksRef = collection(db, MAGIC_LINKS_COLLECTION);
  const linksQuery = query(linksRef, where("token", "==", token), limit(1));
  const snapshot = await getDocs(linksQuery);
  const linkDoc = snapshot.docs[0];

  return linkDoc ? normalizeMagicLink(linkDoc.id, linkDoc.data()) : null;
}

export async function consumeMagicLink(
  token: string,
  metadata: { userAgent?: string; ipHash?: string } = {},
): Promise<ConsumeMagicLinkResult> {
  const magicLink = await getMagicLinkByToken(token);

  if (!magicLink) {
    return { ok: false, reason: "missing" };
  }

  if (magicLink.isUsed) {
    return { ok: false, reason: "used" };
  }

  if (magicLink.expiresAt.getTime() < Date.now()) {
    await updateDoc(
      doc(db, MAGIC_LINKS_COLLECTION, magicLink.id),
      stripUndefinedDeep({ updatedAt: serverTimestamp() }),
    );
    return { ok: false, reason: "expired" };
  }

  await updateDoc(
    doc(db, MAGIC_LINKS_COLLECTION, magicLink.id),
    stripUndefinedDeep({
      isUsed: true,
      usedAt: serverTimestamp(),
      firstUserAgent: metadata.userAgent,
      firstIpHash: metadata.ipHash,
      updatedAt: serverTimestamp(),
    }),
  );

  const customer = await getCustomerById(magicLink.customerId);

  if (!customer) {
    return { ok: false, reason: "missing" };
  }

  await updateDoc(
    doc(db, CUSTOMERS_COLLECTION, customer.id),
    stripUndefinedDeep({
      status: "active",
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  return {
    ok: true,
    customer: {
      ...customer,
      status: "active",
      lastLoginAt: new Date(),
    },
  };
}
