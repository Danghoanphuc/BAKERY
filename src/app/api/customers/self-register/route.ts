import { NextResponse } from "next/server";

import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import {
  getVietnamPhoneValidationError,
  normalizePhoneInput,
} from "@/lib/auth/phone";
import { validatePin } from "@/lib/auth/password";
import { createCustomer, getCustomerByPhone } from "@/lib/firebase";
import { setCustomerPin } from "@/lib/firebase/customer-auth";

export async function POST(request: Request) {
  try {
    const { name, phone, pin, confirmPin } = await request.json();
    const normalizedPhone =
      typeof phone === "string" ? normalizePhoneInput(phone) : "";

    if (typeof name !== "string" || !name.trim() || !normalizedPhone) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên và số điện thoại." },
        { status: 400 },
      );
    }

    const phoneError = getVietnamPhoneValidationError(normalizedPhone);
    if (phoneError) {
      return NextResponse.json({ error: phoneError }, { status: 400 });
    }

    if (typeof pin !== "string" || typeof confirmPin !== "string") {
      return NextResponse.json(
        { error: "Vui lòng tạo mã PIN 4 số." },
        { status: 400 },
      );
    }

    const pinError = validatePin(pin);
    if (pinError) {
      return NextResponse.json({ error: pinError }, { status: 400 });
    }

    if (pin !== confirmPin) {
      return NextResponse.json(
        { error: "Mã PIN nhập lại chưa khớp." },
        { status: 400 },
      );
    }

    const existingCustomer = await getCustomerByPhone(normalizedPhone);
    if (existingCustomer) {
      return NextResponse.json(
        {
          error: "Số điện thoại này đã được đăng ký. Bạn có muốn đăng nhập không?",
          code: "phone_exists",
        },
        { status: 409 },
      );
    }

    let customer;
    try {
      customer = await createCustomer({
        name,
        phone: normalizedPhone,
        status: "active",
        loyaltyPoints: 0,
        tier: "new",
        personalization: {},
      });
    } catch (createError: any) {
      if (createError.message === "Customer with this phone already exists") {
        return NextResponse.json(
          {
            error: "Số điện thoại này đã được đăng ký. Bạn có muốn đăng nhập không?",
            code: "phone_exists",
          },
          { status: 409 },
        );
      }
      throw createError;
    }
    
    await setCustomerPin(customer.id, pin);

    const response = NextResponse.json({
      ok: true,
      customer: { ...customer, hasPassword: true, passwordSetAt: new Date() },
      message: "Đã tạo hồ sơ thành viên.",
    });
    response.headers.append("Set-Cookie", createCustomerSessionCookie(customer.id));
    return response;
  } catch (error) {
    console.error("Self register failed:", error);
    return NextResponse.json(
      { error: "Không thể tạo tài khoản." },
      { status: 500 },
    );
  }
}
