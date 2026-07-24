import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getVoucherAuditLog,
  getVoucherCampaignVersions,
  getVoucherIssues,
  getVoucherRedemptions,
} from "@/lib/wholesale-firebase";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const [storedIssues, redemptions, versions, auditLog] = await Promise.all([
      getVoucherIssues(id),
      getVoucherRedemptions(id),
      getVoucherCampaignVersions(id),
      getVoucherAuditLog(id),
    ]);
    const representedCustomers = new Set(storedIssues.map((item) => item.customerId || item.phone).filter(Boolean));
    const legacyIssues = redemptions
      .filter((item) => !representedCustomers.has(item.customerId || item.phone))
      .map((item) => ({
        id: `legacy-${item.id}`, campaignId: id, customerId: item.customerId, phone: item.phone,
        issueMethod: "legacy_redemption", status: "redeemed", actor: "system:legacy",
        issuedAt: item.createdAt, expiresAt: undefined,
      }));
    const issues = [...storedIssues, ...legacyIssues].sort((a, b) =>
      (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0));
    return NextResponse.json({ issues, versions, auditLog });
  } catch (error) {
    console.error("Failed to load voucher lifecycle:", error);
    return NextResponse.json({ error: "Không thể tải vòng đời voucher." }, { status: 500 });
  }
}
