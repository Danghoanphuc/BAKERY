import { NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  createClearCustomerSessionCookie,
  readCookie,
  revokeCustomerSessionValue,
} from "@/lib/auth/customer-session";

async function logout(request: Request) {
  const token = readCookie(
    request.headers.get("cookie"),
    CUSTOMER_SESSION_COOKIE,
  );
  await revokeCustomerSessionValue(token).catch((error) => {
    console.error("Failed to revoke customer session during logout:", error);
  });

  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/account/login" },
  });
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}

// Support both POST (from fetch) and GET (from direct navigation)
export async function POST(request: Request) {
  return logout(request);
}

export async function GET(request: Request) {
  return logout(request);
}
