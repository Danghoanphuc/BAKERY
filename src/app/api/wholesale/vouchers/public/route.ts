import { NextResponse } from "next/server";
import {
  getAllOrders,
  getCustomerById,
  getMarketingCampaigns,
  getMarketingSettings,
  getVoucherRedemptionUsage,
} from "@/lib/wholesale-firebase";
import { buildCustomerRewards } from "@/lib/wholesale-customer-rewards";
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
  const session = await parseCustomerSessionValue(sessionValue);

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
      const visibility = await Promise.all(
        vouchers.map(async (voucher) => {
          const maxUsesPerPhone = Math.max(0, voucher.maxUsesPerPhone ?? 1);
          if (maxUsesPerPhone === 0) return voucher;

          const usageCount = await getVoucherRedemptionUsage({
            voucherId: voucher.id,
            voucherCode: voucher.code,
            customerId: customer.id,
            phone: customer.phone,
          });

          return usageCount >= maxUsesPerPhone ? null : voucher;
        }),
      );
      vouchers = visibility.filter((voucher) => voucher !== null);
    }
  }

  return NextResponse.json({
    vouchers,
  });
}
