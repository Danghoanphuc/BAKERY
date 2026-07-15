import { NextResponse } from "next/server";
import { deleteCustomer, getCustomerById, updateCustomer } from "@/lib/firebase";
import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { CustomerAddressBookEntry, CustomerInput, CustomerPersonalization } from "@/types";

function customerSession(request: Request) {
  return parseCustomerSessionValue(
    readCookie(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE),
  );
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().slice(0, maxLength);
  return normalized || undefined;
}

function cleanStrings(value: unknown, maxItems = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, 80))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function cleanAddressBook(value: unknown): CustomerAddressBookEntry[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 10).flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const street = cleanString(item.street, 240);
    const formattedAddress = cleanString(item.formattedAddress, 320);
    if (!street && !formattedAddress) return [];
    return [{
      id: cleanString(item.id, 80) ?? crypto.randomUUID(),
      label: cleanString(item.label, 40) ?? `Địa chỉ ${index + 1}`,
      recipientName: cleanString(item.recipientName, 100),
      recipientPhone: cleanString(item.recipientPhone, 20),
      street: street ?? formattedAddress ?? "",
      district: cleanString(item.district, 100) ?? "",
      city: cleanString(item.city, 100) ?? "",
      formattedAddress,
      lat: typeof item.lat === "number" && Number.isFinite(item.lat) ? item.lat : undefined,
      lng: typeof item.lng === "number" && Number.isFinite(item.lng) ? item.lng : undefined,
      placeId: cleanString(item.placeId, 160),
      note: cleanString(item.note, 240),
      isDefault: Boolean(item.isDefault),
      createdAt: cleanString(item.createdAt, 40),
      updatedAt: new Date().toISOString(),
    }];
  }).map((entry, index, all) => ({
    ...entry,
    isDefault: index === Math.max(0, all.findIndex((item) => item.isDefault)),
  }));
}

function customerUpdatePayload(body: unknown): Partial<CustomerInput> {
  const data = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const input = data.personalization && typeof data.personalization === "object"
    ? data.personalization as Record<string, unknown>
    : {};
  const addressBook = cleanAddressBook(input.addressBook);
  const birthday = cleanString(input.birthday ?? data.birthday, 10);
  const personalization: CustomerPersonalization = {
    birthday,
    defaultDeliveryAddress: cleanString(input.defaultDeliveryAddress, 320)
      ?? addressBook.find((address) => address.isDefault)?.formattedAddress,
    addressBook,
    favoriteFlavors: cleanStrings(input.favoriteFlavors),
    favoriteProducts: cleanStrings(input.favoriteProducts),
    dietaryNotes: cleanString(input.dietaryNotes, 500),
    specialOccasions: cleanString(input.specialOccasions, 500),
    notes: cleanString(input.notes, 500),
    sweetnessLevel: ["low", "medium", "high"].includes(String(input.sweetnessLevel))
      ? input.sweetnessLevel as CustomerPersonalization["sweetnessLevel"]
      : undefined,
    favoriteCategories: cleanStrings(input.favoriteCategories),
    typicalPartySize: typeof input.typicalPartySize === "number"
      ? Math.min(100, Math.max(1, Math.round(input.typicalPartySize)))
      : undefined,
    preferredBudget: ["under_100k", "100k_300k", "over_300k"].includes(String(input.preferredBudget))
      ? input.preferredBudget as CustomerPersonalization["preferredBudget"]
      : undefined,
    orderNotifications: input.orderNotifications !== false,
    marketingConsent: input.marketingConsent === true,
    consentUpdatedAt: cleanString(input.consentUpdatedAt, 40),
  };
  return {
    name: cleanString(data.name, 100) ?? "Khách hàng",
    email: cleanString(data.email, 160),
    birthday,
    gender: ["male", "female", "other"].includes(String(data.gender))
      ? data.gender as CustomerInput["gender"]
      : undefined,
    preferredChannel: ["phone", "zalo", "sms", "email"].includes(String(data.preferredChannel))
      ? data.preferredChannel as CustomerInput["preferredChannel"]
      : undefined,
    personalization,
  };
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const adminDenied = requireAdmin(request);
    const isAdmin = adminDenied === null;
    const session = isAdmin ? null : await customerSession(request);
    if (!isAdmin && !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin && session?.customerId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    if (!isAdmin) {
      const body = data && typeof data === "object" ? data as Record<string, unknown> : {};
      const name = cleanString(body.name, 100);
      const email = cleanString(body.email, 160);
      const birthday = cleanString((body.personalization as Record<string, unknown> | undefined)?.birthday ?? body.birthday, 10);
      if (!name) return NextResponse.json({ error: "Tên không hợp lệ." }, { status: 400 });
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Email không hợp lệ." }, { status: 400 });
      }
      if (birthday) {
        const parsed = new Date(`${birthday}T00:00:00`);
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() > Date.now()) {
          return NextResponse.json({ error: "Ngày sinh không hợp lệ." }, { status: 400 });
        }
      }
    }
    await updateCustomer(id, isAdmin ? data : customerUpdatePayload(data));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const customer = await getCustomerById(id);

    if (!customer) {
      return NextResponse.json(
        { error: "Không tìm thấy khách hàng" },
        { status: 404 },
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Không thể tải khách hàng" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const unauthorized = requireAdmin(request);
    if (unauthorized) return unauthorized;
    const { id } = await context.params;
    const customer = await getCustomerById(id);

    if (!customer) {
      return NextResponse.json(
        { error: "Không tìm thấy khách hàng" },
        { status: 404 },
      );
    }

    await deleteCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Không thể xoá khách hàng" },
      { status: 500 },
    );
  }
}
