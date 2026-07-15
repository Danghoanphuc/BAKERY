import { NextResponse } from "next/server";
import { getCustomerByPhone, getCustomerByZaloUserId, updateCustomer } from "@/lib/firebase";
import { createCustomerSessionCookie } from "@/lib/auth/customer-session";

type ZaloProfile = {
  id?: string;
  phone?: string;
};

async function exchangeZaloCode(code: string, redirectUri: string) {
  const appId = process.env.ZALO_APP_ID;
  const appSecret = process.env.ZALO_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("Zalo OAuth is not configured");
  }

  const response = await fetch("https://oauth.zaloapp.com/v4/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: appSecret,
    },
    body: new URLSearchParams({
      app_id: appId,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not exchange Zalo code");
  }

  return response.json() as Promise<{ access_token?: string }>;
}

async function fetchZaloProfile(accessToken: string): Promise<ZaloProfile> {
  const response = await fetch("https://graph.zalo.me/v2.0/me?fields=id,name,picture,phone", {
    headers: { access_token: accessToken },
  });

  if (!response.ok) {
    throw new Error("Could not fetch Zalo profile");
  }

  return response.json() as Promise<ZaloProfile>;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectUri = process.env.ZALO_REDIRECT_URI || `${url.origin}/auth/zalo/callback`;

  if (!code) {
    return NextResponse.redirect(new URL("/account/login?error=zalo_missing_code", url.origin));
  }

  try {
    const tokenResult = await exchangeZaloCode(code, redirectUri);

    if (!tokenResult.access_token) {
      throw new Error("Zalo access token missing");
    }

    const profile = await fetchZaloProfile(tokenResult.access_token);
    let customer = profile.id ? await getCustomerByZaloUserId(profile.id) : null;

    if (!customer && profile.phone) {
      customer = await getCustomerByPhone(profile.phone);
    }

    if (!customer) {
      return NextResponse.redirect(new URL("/account/login?error=zalo_no_customer", url.origin));
    }

    if (profile.id && customer.zaloUserId !== profile.id) {
      await updateCustomer(customer.id, { zaloUserId: profile.id, status: "active" });
    }

    const response = NextResponse.redirect(new URL("/profile", url.origin));
    response.headers.append(
      "Set-Cookie",
      await createCustomerSessionCookie(customer.id, request, {
        authLevel: "zalo",
      }),
    );
    return response;
  } catch (error) {
    console.error("Zalo login failed:", error);
    return NextResponse.redirect(new URL("/account/login?error=zalo_failed", url.origin));
  }
}
