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
import { getPublicVouchersFromCampaigns } from "@/lib/vouchers";

export async function GET(request: Request) {
  const campaigns = await getMarketingCampaigns();
  let vouchers = getPublicVouchersFromCampaigns(campaigns);

  const sessionValue = readCookie(
    request.headers.get("cookie"),
    CUSTOMER_SESSION_COOKIE,
  );
  const session = parseCustomerSessionValue(sessionValue);

  if (session) {
    const customer = await getCustomerById(session.customerId);

    if (customer) {
      const [allOrders, settings] = await Promise.all([
        getAllOrders(),
        getMarketingSettings(),
      ]);
      const rewards = buildCustomerRewards(customer, allOrders, settings, campaigns);
      const ownedVoucherIds = new Set(
        rewards.vouchers
          .filter((voucher) => voucher.unlocked)
          .map((voucher) => voucher.id),
      );

      vouchers = vouchers.filter((voucher) => !ownedVoucherIds.has(voucher.id));
    }
  }

  return NextResponse.json({
    vouchers,
  });
}
