import { createHash, randomBytes } from "crypto";

import {
  createStoredCustomerSession,
  getStoredCustomerSession,
  revokeStoredCustomerSession,
  touchStoredCustomerSession,
  type CustomerSessionAuthLevel,
} from "@/lib/firebase/customer-sessions";
import { getSessionDevice } from "./session-device";

export const CUSTOMER_SESSION_COOKIE = "bakery_customer_session";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 365;
const SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000;

export type CustomerSession = {
  customerId: string;
  sessionId: string;
  expiresAt: Date;
  authLevel: CustomerSessionAuthLevel;
  strongAuthenticatedAt?: Date;
};

const RECENT_STRONG_AUTH_MS = 5 * 60 * 1000;

export function hashCustomerSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createCustomerSessionCookie(
  customerId: string,
  request?: Request,
  options: { authLevel?: CustomerSessionAuthLevel } = {},
) {
  const token = randomBytes(32).toString("base64url");
  const sessionId = hashCustomerSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const device = getSessionDevice(request);
  const authLevel = options.authLevel ?? "guest";
  const strongAuthenticatedAt = ["pin", "passkey"].includes(authLevel)
    ? now
    : undefined;

  await createStoredCustomerSession(sessionId, {
    customerId,
    ...device,
    createdAt: now,
    lastSeenAt: now,
    expiresAt,
    authLevel,
    strongAuthenticatedAt,
  });

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CUSTOMER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export async function parseCustomerSessionValue(
  value?: string | null,
): Promise<CustomerSession | null> {
  if (!value || value.length < 32 || value.length > 128) return null;

  const sessionId = hashCustomerSessionToken(value);
  const stored = await getStoredCustomerSession(sessionId);
  if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  if (Date.now() - stored.lastSeenAt.getTime() >= SESSION_TOUCH_INTERVAL_MS) {
    await touchStoredCustomerSession(sessionId, new Date()).catch((error) => {
      console.error("Failed to touch customer session:", error);
    });
  }

  return {
    customerId: stored.customerId,
    sessionId,
    expiresAt: stored.expiresAt,
    authLevel: stored.authLevel,
    strongAuthenticatedAt: stored.strongAuthenticatedAt,
  };
}

export function hasRecentStrongAuthentication(session: CustomerSession) {
  return (
    (session.authLevel === "pin" || session.authLevel === "passkey") &&
    Boolean(session.strongAuthenticatedAt) &&
    Date.now() - session.strongAuthenticatedAt!.getTime() <=
      RECENT_STRONG_AUTH_MS
  );
}

export async function revokeCustomerSessionValue(value?: string | null) {
  if (!value) return;
  const sessionId = hashCustomerSessionToken(value);
  const stored = await getStoredCustomerSession(sessionId);
  if (stored && !stored.revokedAt) {
    await revokeStoredCustomerSession(sessionId);
  }
}

export function createClearCustomerSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return null;
  }
}
