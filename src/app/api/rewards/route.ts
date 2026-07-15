import { NextResponse } from "next/server";
import {
  getAllOrders,
  getCustomerById,
  getMarketingCampaigns,
  getMarketingSettings,
  getVoucherRedemptionUsage,
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
  const session = await parseCustomerSessionValue(sessionValue);

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
  const vouchers = await Promise.all(
    rewards.vouchers.map(async (voucher) => {
      const maxUsesPerPhone = Math.max(0, voucher.maxUsesPerPhone ?? 1);
      if (!voucher.code || maxUsesPerPhone === 0) return voucher;

      const usageCount = await getVoucherRedemptionUsage({
        voucherId: voucher.id,
        voucherCode: voucher.code,
        customerId: customer.id,
        phone: customer.phone,
      });

      return usageCount >= maxUsesPerPhone ? null : voucher;
    }),
  );

  return NextResponse.json({
    ...rewards,
    vouchers: vouchers.filter((voucher) => voucher !== null),
  });
}
