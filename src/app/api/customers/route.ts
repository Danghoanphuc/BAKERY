import { NextResponse } from "next/server";

import { getVietnamPhoneValidationError, normalizePhoneInput } from "@/lib/auth/phone";
import { createCustomer, getAllCustomers, getCustomerByPhone } from "@/lib/firebase";

export async function GET() {
  try {
    const customers = await getAllCustomers();
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Không thể tải danh sách khách hàng" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as Record<string, unknown>;
    const name = typeof data.name === "string" ? data.name.trim() : "";
    const phone = normalizePhoneInput(typeof data.phone === "string" ? data.phone : "");
    const phoneError = getVietnamPhoneValidationError(phone);

    if (!name) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên khách hàng" },
        { status: 400 },
      );
    }

    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const existingCustomer = await getCustomerByPhone(phone);

    if (existingCustomer) {
      return NextResponse.json(
        {
          error: "Số điện thoại này đã được đăng ký.",
          code: "phone_exists",
          customer: existingCustomer,
        },
        { status: 409 },
      );
    }

    let customer;
    try {
      customer = await createCustomer({
        name,
        phone,
        email: typeof data.email === "string" ? data.email : undefined,
        birthday: typeof data.birthday === "string" ? data.birthday : undefined,
        status: "active",
        tags: Array.isArray(data.tags)
          ? data.tags.filter((tag): tag is string => typeof tag === "string")
          : [],
        internalNotes:
          typeof data.internalNotes === "string" ? data.internalNotes : undefined,
        riskLevel:
          data.riskLevel === "green" ||
          data.riskLevel === "yellow" ||
          data.riskLevel === "red"
            ? data.riskLevel
            : "green",
        preferredChannel:
          data.preferredChannel === "phone" ||
          data.preferredChannel === "zalo" ||
          data.preferredChannel === "sms" ||
          data.preferredChannel === "email"
            ? data.preferredChannel
            : "phone",
        personalization:
          data.personalization && typeof data.personalization === "object"
            ? data.personalization
            : undefined,
      });
    } catch (createError: any) {
      if (createError.message === "Customer with this phone already exists") {
        const existingCustomer = await getCustomerByPhone(phone);
        return NextResponse.json(
          {
            error: "Số điện thoại này đã được đăng ký.",
            code: "phone_exists",
            customer: existingCustomer,
          },
          { status: 409 },
        );
      }
      throw createError;
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Không thể tạo khách hàng" },
      { status: 500 },
    );
  }
}
