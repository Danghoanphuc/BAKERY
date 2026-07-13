import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_SESSION_COOKIE = "bakery_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

type AdminSession = { subject: "admin"; exp: number };

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SESSION_SECRET_NOT_CONFIGURED");
  }
  return secret || "bakery-local-admin-session-secret";
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return process.env.NODE_ENV !== "production" && password === "admin";
  const providedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
}

export function createAdminSessionValue() {
  const session: AdminSession = {
    subject: "admin",
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function parseAdminSessionValue(value?: string | null) {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AdminSession;
    return session.subject === "admin" && session.exp >= Math.floor(Date.now() / 1000)
      ? session
      : null;
  } catch {
    return null;
  }
}

export function createAdminSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${createAdminSessionValue()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

