import { NextResponse } from "next/server";

import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import {
  getVietnamPhoneValidationError,
  normalizePhoneInput,
} from "@/lib/auth/phone";
import { validatePin } from "@/lib/auth/password";
import { verifyCustomerPin } from "@/lib/firebase/customer-auth";

export async function POST(request: Request) {
  try {
    const { phone, pin, password } = await request.json();
    const normalizedPhone =
      typeof phone === "string" ? normalizePhoneInput(phone) : "";
    const submittedPin =
      typeof pin === "string"
        ? pin
        : typeof password === "string"
          ? password
          : "";

    if (!normalizedPhone || !submittedPin) {
      return NextResponse.json(
        { error: "Vui lòng nhập số điện thoại và mã PIN." },
        { status: 400 },
      );
    }

    const phoneError = getVietnamPhoneValidationError(normalizedPhone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    const pinError = validatePin(submittedPin);
    if (pinError) {
      return NextResponse.json({ error: pinError }, { status: 400 });
    }

    const customer = await verifyCustomerPin(normalizedPhone, submittedPin);

    if (!customer) {
      return NextResponse.json(
        { error: "Số điện thoại hoặc mã PIN không đúng." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true, customer });
    response.headers.append("Set-Cookie", createCustomerSessionCookie(customer.id));
    return response;
  } catch (error) {
    console.error("PIN login failed:", error);
    return NextResponse.json(
      { error: "Không thể đăng nhập. Vui lòng thử lại." },
      { status: 500 },
    );
  }
}
