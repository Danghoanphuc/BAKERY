import { createHmac, timingSafeEqual } from "crypto";
import { isAdminRole, type AdminPrincipal, type AdminRole } from "./admin-rbac";

export const ADMIN_SESSION_COOKIE = "bakery_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type AdminSession = AdminPrincipal & { subject: "admin"; exp: number };

type AdminAccountConfig = AdminPrincipal & { password: string };

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

function passwordsMatch(password: string, expected: string) {
  const providedBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
}

function configuredAccounts(): AdminAccountConfig[] {
  const raw = process.env.ADMIN_ACCOUNTS_JSON;
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw) as unknown;
    if (!Array.isArray(entries)) return [];
    return entries.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      if (typeof item.password !== "string" || !item.password || !isAdminRole(item.role)) return [];
      return [{
        id: typeof item.id === "string" && item.id ? item.id : `admin-${index + 1}`,
        name: typeof item.name === "string" && item.name ? item.name : `Nhân viên ${index + 1}`,
        role: item.role,
        password: item.password,
      }];
    });
  } catch {
    return [];
  }
}

export function verifyAdminCredentials(password: string): AdminPrincipal | null {
  const account = configuredAccounts().find((item) => passwordsMatch(password, item.password));
  if (account) return { id: account.id, name: account.name, role: account.role };

  const expected = process.env.ADMIN_PASSWORD;
  const validLegacy = expected
    ? passwordsMatch(password, expected)
    : process.env.NODE_ENV !== "production" && password === "admin";
  return validLegacy ? { id: "owner", name: "Owner", role: "owner" } : null;
}

export function verifyAdminPassword(password: string) {
  return Boolean(verifyAdminCredentials(password));
}

export function createAdminSessionValue(principal: AdminPrincipal = { id: "owner", name: "Owner", role: "owner" }) {
  const session: AdminSession = {
    subject: "admin",
    ...principal,
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
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AdminSession> & { subject?: string; exp?: number; role?: AdminRole };
    if (parsed.subject !== "admin" || typeof parsed.exp !== "number" || parsed.exp < Math.floor(Date.now() / 1000)) return null;
    const session: AdminSession = {
      subject: "admin",
      exp: parsed.exp,
      id: typeof parsed.id === "string" ? parsed.id : "owner",
      name: typeof parsed.name === "string" ? parsed.name : "Owner",
      role: isAdminRole(parsed.role) ? parsed.role : "owner",
    };
    return session;
  } catch {
    return null;
  }
}

export function createAdminSessionCookie(principal?: AdminPrincipal) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE}=${createAdminSessionValue(principal)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}
