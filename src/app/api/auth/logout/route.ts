import { NextResponse } from "next/server";
import { createClearCustomerSessionCookie } from "@/lib/auth/customer-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append("Set-Cookie", createClearCustomerSessionCookie());
  return response;
}
