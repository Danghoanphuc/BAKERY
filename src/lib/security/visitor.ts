import { createHash, randomBytes } from "crypto";

export const VISITOR_COOKIE = "bakery_visitor";
export const VISITOR_TTL_SECONDS = 60 * 60 * 24 * 365;

export function createVisitorToken() {
  return randomBytes(24).toString("base64url");
}

export function hashVisitorToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readVisitorToken(request: Request) {
  const value = readCookieValue(request.headers.get("cookie"), VISITOR_COOKIE);
  return value && value.length >= 24 && value.length <= 96 ? value : null;
}

function readCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const item = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.slice(name.length + 1));
  } catch {
    return null;
  }
}

export function readVisitorHash(request: Request) {
  const token = readVisitorToken(request);
  return token ? hashVisitorToken(token) : undefined;
}
