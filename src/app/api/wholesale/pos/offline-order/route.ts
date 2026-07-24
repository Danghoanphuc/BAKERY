import { NextResponse } from "next/server";
import {
  createMagicLinkForCustomer,
  createOrUpdateCustomerFromPurchase,
} from "@/lib/wholesale-firebase";
import { sendZaloOaMagicLink } from "@/lib/zalo/oa";
import { requireAdmin } from "@/lib/auth/require-admin";

type OfflineOrderPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  zaloUserId?: string;
  productName?: string;
  pointsEarned?: number;
};

function getOrigin(request: Request) {
  const url = new URL(request.url);
  return process.env.NEXT_PUBLIC_APP_URL || url.origin;
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const payload = (await request.json()) as OfflineOrderPayload;

    if (!payload.customerName || !payload.customerPhone) {
      return NextResponse.json(
        { error: "customerName and customerPhone are required" },
        { status: 400 },
      );
    }

    const customer = await createOrUpdateCustomerFromPurchase({
      name: payload.customerName,
      phone: payload.customerPhone,
      email: payload.customerEmail,
      status: "active",
      loyaltyPoints: payload.pointsEarned ?? 0,
      zaloUserId: payload.zaloUserId,
    });
    const magicLink = await createMagicLinkForCustomer(customer.id);
    const magicLinkUrl = `${getOrigin(request)}${magicLink.urlPath}`;
    const zalo = await sendZaloOaMagicLink({
      zaloUserId: customer.zaloUserId ?? payload.zaloUserId,
      customerName: customer.name,
      productName: payload.productName,
      magicLinkUrl,
    });

    return NextResponse.json({
      customer: magicLink.customer,
      magicLinkUrl,
      expiresAt: magicLink.expiresAt,
      zalo,
    });
  } catch (error) {
    console.error("Offline order CRM webhook failed:", error);
    return NextResponse.json(
      { error: "Failed to process offline order" },
      { status: 500 },
    );
  }
}
