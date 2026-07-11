import { CUSTOMER_SESSION_COOKIE, parseCustomerSessionValue, readCookie } from "@/lib/auth/customer-session";
import { getCustomerById } from "@/lib/firebase";
import type { Order } from "@/types/order";

export async function getCustomerOrderAccess(request: Request) {
  const sessionValue = readCookie(
    request.headers.get("cookie"),
    CUSTOMER_SESSION_COOKIE,
  );
  const session = parseCustomerSessionValue(sessionValue);

  if (!session) return null;

  const customer = await getCustomerById(session.customerId);
  return {
    customer,
    customerId: session.customerId,
    phone: customer?.phone,
  };
}

export function canAccessCustomerOrder(
  order: Order,
  access: Awaited<ReturnType<typeof getCustomerOrderAccess>>,
) {
  if (!access) return false;
  if (order.customerId && order.customerId === access.customerId) return true;
  return Boolean(access.phone && order.customerPhone === access.phone);
}
