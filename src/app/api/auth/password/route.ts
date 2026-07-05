import { NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import { validatePassword, verifyPassword } from "@/lib/auth/password";
import {
  getCustomerAuthByPhone,
  getCustomerById,
} from "@/lib/firebase/customers";
import { setCustomerPassword } from "@/lib/firebase/customer-auth";

export async function POST(request: Request) {
  try {
    const sessionValue = readCookie(
      request.headers.get("cookie"),
      CUSTOMER_SESSION_COOKIE,
    );
    const session = parseCustomerSessionValue(sessionValue);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Mat khau moi khong hop le." },
        { status: 400 },
      );
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    if (customer.hasPassword) {
      if (typeof currentPassword !== "string") {
        return NextResponse.json(
          { error: "Vui long nhap mat khau hien tai." },
          { status: 400 },
        );
      }

      const authCustomer = await getCustomerAuthByPhone(customer.phone);
      if (!verifyPassword(currentPassword, authCustomer?.passwordHash)) {
        return NextResponse.json(
          { error: "Mat khau hien tai khong dung." },
          { status: 401 },
        );
      }
    }

    await setCustomerPassword(customer.id, newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Set password failed:", error);
    return NextResponse.json(
      { error: "Khong the cap nhat mat khau." },
      { status: 500 },
    );
  }
}
