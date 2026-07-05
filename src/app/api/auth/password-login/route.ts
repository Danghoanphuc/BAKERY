import { NextResponse } from "next/server";

import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import { verifyCustomerPassword } from "@/lib/firebase/customer-auth";

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (typeof phone !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Phone and password are required" },
        { status: 400 },
      );
    }

    const customer = await verifyCustomerPassword(phone, password);

    if (!customer) {
      return NextResponse.json(
        { error: "So dien thoai hoac mat khau khong dung." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true, customer });
    response.headers.append("Set-Cookie", createCustomerSessionCookie(customer.id));
    return response;
  } catch (error) {
    console.error("Password login failed:", error);
    return NextResponse.json(
      { error: "Khong the dang nhap. Vui long thu lai." },
      { status: 500 },
    );
  }
}
