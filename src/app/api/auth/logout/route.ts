import { NextResponse } from "next/server";
import { createClearCustomerSessionCookie } from "@/lib/auth/customer-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}

// Handle direct URL access or browser navigation to logout endpoint
export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/account/login", url.origin));
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}
