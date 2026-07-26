import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, parseAdminSessionValue } from "./admin-session";
import { readCookie } from "./customer-session";
import { canAdminAccessPath } from "./admin-rbac";

export function getAdminSession(request: Request) {
  const value = readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  return parseAdminSessionValue(value);
}

export function requireAdmin(request: Request) {
  const session = getAdminSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const pathname = new URL(request.url).pathname;
  return canAdminAccessPath(session.role, pathname)
    ? null
    : NextResponse.json({ error: "Forbidden", requiredPath: pathname }, { status: 403 });
}
