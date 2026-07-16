import { NextResponse } from "next/server";
import { createAdminSessionCookie, verifyAdminCredentials } from "@/lib/auth/admin-session";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const principal = typeof body?.password === "string" ? verifyAdminCredentials(body.password) : null;
  if (!principal) {
    return NextResponse.json({ error: "Thông tin đăng nhập không đúng." }, { status: 401 });
  }
  const response = NextResponse.json({ success: true, admin: principal });
  response.headers.set("Set-Cookie", createAdminSessionCookie(principal));
  return response;
}
