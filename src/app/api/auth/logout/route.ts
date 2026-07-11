import { NextResponse } from "next/server";
import { createClearCustomerSessionCookie } from "@/lib/auth/customer-session";

// Support both POST (from fetch) and GET (from direct navigation)
export async function POST(_request: Request) {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/account/login" },
  });
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}

export async function GET(_request: Request) {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/account/login" },
  });
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}
