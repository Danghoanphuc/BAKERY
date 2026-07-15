import { NextResponse } from "next/server";
import { getCustomerById } from "@/lib/firebase";
import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";

export async function GET(request: Request) {
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

  return NextResponse.json({ customer });
}
