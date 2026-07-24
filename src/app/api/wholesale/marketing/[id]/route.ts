import { NextResponse } from "next/server";
import {
  deleteMarketingCampaign,
  getMarketingCampaigns,
  updateVoucherCampaignLifecycle,
} from "@/lib/wholesale-firebase";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const data = await request.json();
    await updateVoucherCampaignLifecycle({
      campaignId: id,
      patch: data,
      actor: "admin",
      reason: typeof data.changeReason === "string" ? data.changeReason : undefined,
      action: typeof data.auditAction === "string" ? data.auditAction : "campaign_updated",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating marketing campaign:", error);
    return NextResponse.json(
      { error: "Failed to update marketing campaign" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await context.params;
    const campaign = (await getMarketingCampaigns()).find((item) => item.id === id);
    if (!campaign) return NextResponse.json({ error: "Không tìm thấy campaign." }, { status: 404 });
    const issued = campaign.metrics?.issuedCount ?? 0;
    const spent = campaign.metrics?.discountSpent ?? 0;
    if (campaign.status !== "draft" || issued > 0 || spent > 0) {
      return NextResponse.json(
        { error: "Campaign đã phát hành không thể xóa. Hãy chuyển sang Kết thúc hoặc Lưu trữ." },
        { status: 409 },
      );
    }
    await deleteMarketingCampaign(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting marketing campaign:", error);
    return NextResponse.json(
      { error: "Failed to delete marketing campaign" },
      { status: 500 },
    );
  }
}
