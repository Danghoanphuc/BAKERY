import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appId = process.env.ZALO_APP_ID;
  const redirectUri = process.env.ZALO_REDIRECT_URI || `${url.origin}/auth/zalo/callback`;

  if (!appId) {
    return NextResponse.redirect(new URL("/account/login?error=zalo_not_configured", url.origin));
  }

  const state = crypto.randomUUID();
  const zaloUrl = new URL("https://oauth.zaloapp.com/v4/permission");
  zaloUrl.searchParams.set("app_id", appId);
  zaloUrl.searchParams.set("redirect_uri", redirectUri);
  zaloUrl.searchParams.set("state", state);

  return NextResponse.redirect(zaloUrl);
}