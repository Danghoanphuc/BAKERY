import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, parseAdminSessionValue } from "./admin-session";
import { readCookie } from "./customer-session";

export function requireAdmin(request: Request) {
  const value = readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  return parseAdminSessionValue(value)
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

