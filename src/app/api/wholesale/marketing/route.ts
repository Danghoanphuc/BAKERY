import { NextResponse } from "next/server";
import {
  createMarketingCampaign,
  getMarketingCampaigns,
  getMarketingSettings,
} from "@/lib/wholesale-firebase";
import { requireAdmin } from "@/lib/auth/require-admin";

function buildSummary(campaigns: Awaited<ReturnType<typeof getMarketingCampaigns>>) {
  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === "active",
  );
  const voucherCampaigns = campaigns.filter(
    (campaign) => campaign.type === "voucher",
  );
  const totalBudget = campaigns.reduce(
    (sum, campaign) => sum + (campaign.budget ?? 0),
    0,
  );
  const totalUsed = campaigns.reduce(
    (sum, campaign) => sum + campaign.usedCount,
    0,
  );

  return {
    totalCampaigns: campaigns.length,
    activeCampaigns: activeCampaigns.length,
    voucherCampaigns: voucherCampaigns.length,
    totalBudget,
    totalUsed,
  };
}

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const [campaigns, settings] = await Promise.all([
      getMarketingCampaigns(),
      getMarketingSettings(),
    ]);

    return NextResponse.json({
      campaigns,
      settings,
      summary: buildSummary(campaigns),
    });
  } catch (error) {
    console.error("Error loading marketing data:", error);
    return NextResponse.json(
      { error: "Failed to load marketing data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const data = await request.json();

    if (!data.name || !data.title) {
      return NextResponse.json(
        { error: "Campaign name and title are required" },
        { status: 400 },
      );
    }

    const campaign = await createMarketingCampaign(data);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("Error creating marketing campaign:", error);
    return NextResponse.json(
      { error: "Failed to create marketing campaign" },
      { status: 500 },
    );
  }
}
