import { NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import { validatePin, verifyPassword } from "@/lib/auth/password";
import {
  getCustomerAuthByPhone,
  getCustomerById,
} from "@/lib/firebase/customers";
import { setCustomerPin } from "@/lib/firebase/customer-auth";
import {
  checkPinRateLimit,
  clearPinFailures,
  createPinRateLimitResponse,
  recordPinFailure,
} from "@/lib/auth/pin-rate-limit";

export async function POST(request: Request) {
  try {
    const sessionValue = readCookie(
      request.headers.get("cookie"),
      CUSTOMER_SESSION_COOKIE,
    );
    const session = await parseCustomerSessionValue(sessionValue);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await getCustomerById(session.customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { currentPin, currentPassword, newPin, newPassword } =
      await request.json();
    const nextPin =
      typeof newPin === "string"
        ? newPin
        : typeof newPassword === "string"
          ? newPassword
          : "";
    const oldPin =
      typeof currentPin === "string"
        ? currentPin
        : typeof currentPassword === "string"
          ? currentPassword
          : "";

    const pinError = validatePin(nextPin);
    if (pinError) {
      return NextResponse.json({ error: pinError }, { status: 400 });
    }

    if (customer.hasPassword) {
      if (!oldPin) {
        return NextResponse.json(
          { error: "Vui lòng nhập mã PIN hiện tại." },
          { status: 400 },
        );
      }

      const rateLimit = await checkPinRateLimit(
        request,
        customer.phone,
        "pin-change",
      );
      if (!rateLimit.allowed) return createPinRateLimitResponse(rateLimit);

      const authCustomer = await getCustomerAuthByPhone(customer.phone);
      if (!verifyPassword(oldPin, authCustomer?.passwordHash)) {
        await recordPinFailure(request, customer.phone, "pin-change");
        return NextResponse.json(
          { error: "Mã PIN hiện tại không đúng." },
          { status: 401 },
        );
      }
      await clearPinFailures(request, customer.phone, "pin-change").catch(
        (error) => console.error("Failed to clear PIN change failures:", error),
      );
    }

    await setCustomerPin(customer.id, nextPin);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Set PIN failed:", error);
    return NextResponse.json(
      { error: "Không thể cập nhật mã PIN." },
      { status: 500 },
    );
  }
}
