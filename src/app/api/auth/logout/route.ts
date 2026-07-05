import { NextResponse } from "next/server";
import { createClearCustomerSessionCookie } from "@/lib/auth/customer-session";

// Support both POST (from fetch) and GET (from direct navigation)
export async function POST(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/account/login", url.origin));
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/account/login", url.origin));
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}
