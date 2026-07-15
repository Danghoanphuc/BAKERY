import { NextResponse } from "next/server";
import { getOrdersByCustomer } from "@/lib/db";
import { getCustomerById } from "@/lib/firebase";
import { CUSTOMER_SESSION_COOKIE, parseCustomerSessionValue, readCookie } from "@/lib/auth/customer-session";

export async function GET(request: Request) {
  const session = await parseCustomerSessionValue(readCookie(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customer = await getCustomerById(session.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const orders = await getOrdersByCustomer(customer.id);
  return NextResponse.json({ exportedAt: new Date().toISOString(), customer, orders }, {
    headers: { "Content-Disposition": `attachment; filename="bakery-account-${customer.id}.json"` },
  });
}
