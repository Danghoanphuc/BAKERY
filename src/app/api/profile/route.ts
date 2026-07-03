import { NextResponse } from "next/server";
import {
  getAllOrders,
  getCustomerById,
  getMarketingCampaigns,
  getMarketingSettings,
} from "@/lib/firebase";
import { buildCustomerRewards } from "@/lib/customer-rewards";
import {
  CUSTOMER_SESSION_COOKIE,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";

export async function GET(request: Request) {
  const sessionValue = readCookie(
    request.headers.get("cookie"),
    CUSTOMER_SESSION_COOKIE,
  );
  const session = parseCustomerSessionValue(sessionValue);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customer = await getCustomerById(session.customerId);

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const [allOrders, settings, campaigns] = await Promise.all([
    getAllOrders(),
    getMarketingSettings(),
    getMarketingCampaigns(),
  ]);
  const rewards = buildCustomerRewards(customer, allOrders, settings, campaigns);

  return NextResponse.json({
    customer,
    rewards,
    profile: {
      hasBirthday: Boolean(customer.personalization.birthday),
      hasDeliveryAddress: Boolean(
        customer.personalization.defaultDeliveryAddress,
      ),
      isZaloLinked: Boolean(customer.zaloUserId),
      unlockedVoucherCount: rewards.vouchers.filter(
        (voucher) => voucher.unlocked,
      ).length,
    },
  });
}
