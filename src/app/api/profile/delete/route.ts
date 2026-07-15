import { NextResponse } from "next/server";
import { getOrdersByCustomer, updateOrder } from "@/lib/db";
import { deleteCustomer, getCustomerById } from "@/lib/firebase";
import { deleteCustomerPasskey, listCustomerPasskeys } from "@/lib/firebase/customer-passkeys";
import { listStoredCustomerSessions, revokeStoredCustomerSession } from "@/lib/firebase/customer-sessions";
import {
  CUSTOMER_SESSION_COOKIE,
  createClearCustomerSessionCookie,
  hasRecentStrongAuthentication,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";

export async function DELETE(request: Request) {
  const session = await parseCustomerSessionValue(readCookie(request.headers.get("cookie"), CUSTOMER_SESSION_COOKIE));
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRecentStrongAuthentication(session)) {
    return NextResponse.json({ error: "Vui lòng đăng nhập lại bằng PIN hoặc passkey trước khi xóa tài khoản.", requiresReauthentication: true }, { status: 403 });
  }
  const customer = await getCustomerById(session.customerId);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
  if (body?.confirmation !== "XOA TAI KHOAN") {
    return NextResponse.json({ error: "Xác nhận không hợp lệ." }, { status: 400 });
  }

  const [orders, passkeys, sessions] = await Promise.all([
    getOrdersByCustomer(customer.id),
    listCustomerPasskeys(customer.id),
    listStoredCustomerSessions(customer.id),
  ]);
  await Promise.all([
    ...orders.map((order) => updateOrder(order.id, {
      customerId: "",
      customerName: "Khách hàng đã xóa",
      customerPhone: "",
      customerEmail: "",
      deliveryAddress: "",
      notes: "",
    })),
    ...passkeys.map((passkey) => deleteCustomerPasskey(customer.id, passkey.id)),
    ...sessions.map((stored) => revokeStoredCustomerSession(stored.id)),
  ]);
  await deleteCustomer(customer.id);
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}
