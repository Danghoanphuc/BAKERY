import { readCookie } from "./customer-session";

export const PASSKEY_CHALLENGE_COOKIE = "bakery_passkey_challenge";

export function getPasskeyConfig() {
  const appUrl =
    process.env.PASSKEY_ORIGIN ||
    process.env.NEXT_PUBLIC_CUSTOMER_APP_URL ||
    "http://localhost:3000";
  const origin = new URL(appUrl).origin;
  return {
    origin,
    rpId: process.env.PASSKEY_RP_ID || new URL(origin).hostname,
    rpName: process.env.PASSKEY_RP_NAME || "Bakery",
  };
}

export function createPasskeyChallengeCookie(rawId: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PASSKEY_CHALLENGE_COOKIE}=${rawId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300${secure}`;
}

export function clearPasskeyChallengeCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PASSKEY_CHALLENGE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readPasskeyChallenge(request: Request) {
  return readCookie(request.headers.get("cookie"), PASSKEY_CHALLENGE_COOKIE);
}
