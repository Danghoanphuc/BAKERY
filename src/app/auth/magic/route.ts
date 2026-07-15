import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { consumeMagicLink } from "@/lib/firebase";
import { createCustomerSessionCookie } from "@/lib/auth/customer-session";

function hashIp(value?: string | null) {
  if (!value) return undefined;
  return createHash("sha256").update(value).digest("hex");
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const nextPath = url.searchParams.get("next");

  if (!token) {
    return NextResponse.redirect(new URL("/account/login?error=missing_token", url.origin));
  }

  const result = await consumeMagicLink(token, {
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipHash: hashIp(
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    ),
  });

  if (!result.ok) {
    return NextResponse.redirect(
      new URL(`/account/login?error=magic_${result.reason}`, url.origin),
    );
  }

  const safeNext =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : result.customer.hasPassword
        ? "/profile"
        : "/account/password?setup=1";
  const response = NextResponse.redirect(new URL(safeNext, url.origin));
  response.headers.append(
    "Set-Cookie",
    await createCustomerSessionCookie(result.customer.id, request),
  );
  return response;
}
