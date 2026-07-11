import { NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import { getCustomerById, updateCustomer } from "@/lib/firebase";
import type { CustomerAddressBookEntry } from "@/types";

export async function PUT(request: Request) {
  const session = parseCustomerSessionValue(
    readCookie(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE),
  );
  if (!session) return NextResponse.json({ skipped: true }, { status: 401 });

  const customer = await getCustomerById(session.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const existing = customer.personalization.addressBook ?? [];
  if (existing.length > 0 || customer.personalization.defaultDeliveryAddress) {
    return NextResponse.json({ saved: false, reason: "address_exists" });
  }

  const body = await request.json();
  const formattedAddress = typeof body.formattedAddress === "string" ? body.formattedAddress.trim() : "";
  if (!formattedAddress || typeof body.street !== "string") {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const entry: CustomerAddressBookEntry = {
    id: crypto.randomUUID(),
    label: "Nhà",
    street: body.street,
    district: typeof body.district === "string" ? body.district : "",
    city: typeof body.city === "string" ? body.city : "",
    formattedAddress,
    lat: typeof body.lat === "number" ? body.lat : undefined,
    lng: typeof body.lng === "number" ? body.lng : undefined,
    placeId: typeof body.placeId === "string" ? body.placeId : undefined,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await updateCustomer(customer.id, {
    personalization: {
      ...customer.personalization,
      defaultDeliveryAddress: formattedAddress,
      addressBook: [entry],
    },
  });
  return NextResponse.json({ saved: true, address: entry });
}
