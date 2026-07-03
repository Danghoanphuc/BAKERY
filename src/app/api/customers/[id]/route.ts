import { NextResponse } from "next/server";
import { updateCustomer } from "@/lib/firebase";
import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const sessionValue = readCookie(
      request.headers.get("cookie"),
      CUSTOMER_SESSION_COOKIE,
    );
    const session = parseCustomerSessionValue(sessionValue);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.customerId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();
    await updateCustomer(id, data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 },
    );
  }
}
