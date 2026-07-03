import { NextResponse } from "next/server";
import { createClearCustomerSessionCookie } from "@/lib/auth/customer-session";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(new URL("/account/login", url.origin));
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}