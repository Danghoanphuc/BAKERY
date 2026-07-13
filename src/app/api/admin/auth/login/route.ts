import { NextResponse } from "next/server";
import { createAdminSessionCookie, verifyAdminPassword } from "@/lib/auth/admin-session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  if (typeof body?.password !== "string" || !verifyAdminPassword(body.password)) {
    return NextResponse.json({ error: "Thông tin đăng nhập không đúng." }, { status: 401 });
  }
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", createAdminSessionCookie());
  return response;
}

