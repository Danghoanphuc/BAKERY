import { NextResponse } from "next/server";

import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import { verifyCustomerOtp } from "@/lib/firebase/customer-otp";

export async function POST(request: Request) {
  try {
    const { phone, otp } = await request.json();

    if (typeof phone !== "string" || typeof otp !== "string") {
      return NextResponse.json(
        { error: "Vui lòng nhập số điện thoại và OTP." },
        { status: 400 },
      );
    }

    const customer = await verifyCustomerOtp(phone, otp);
    if (!customer) {
      return NextResponse.json(
        { error: "OTP không đúng hoặc đã hết hạn." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true, customer });
    response.headers.append("Set-Cookie", createCustomerSessionCookie(customer.id));
    return response;
  } catch (error) {
    console.error("Verify OTP failed:", error);
    return NextResponse.json(
      { error: "Không thể xác thực OTP." },
      { status: 500 },
    );
  }
}
