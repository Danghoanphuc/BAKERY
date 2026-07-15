import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { defaultVoucherDraft, type VoucherDraft } from "@/app/(admin)/admin/vouchers/_lib/voucher-admin";
import { normalizeVoucherDraft } from "@/features/admin/vouchers/ai/voucher-ai-service";
import { loadVoucherAiWorkspace } from "@/features/admin/vouchers/ai/voucher-ai-repository";
import { simulateVoucherScenarios, type VoucherBusinessSnapshot } from "@/features/admin/vouchers/ai/voucher-business-context";

export async function GET(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  const campaignId = new URL(request.url).searchParams.get("campaignId")?.trim();
  if (!campaignId) return NextResponse.json({ error: "Thiếu campaignId." }, { status: 400 });

  try {
    const workspace = await loadVoucherAiWorkspace(campaignId);
    if (!workspace) return NextResponse.json({ error: "Không tìm thấy campaign." }, { status: 404 });
    const campaign = workspace.campaign;
    const rules = (campaign.rules ?? {}) as Record<string, unknown>;
    const budget = (campaign.voucherBudget ?? {}) as Record<string, unknown>;
    const publishing = (campaign.publishing ?? {}) as Record<string, unknown>;
    const draft = normalizeVoucherDraft({
      ...defaultVoucherDraft,
      programGoal: campaign.programGoal,
      name: campaign.name,
      code: campaign.code,
      internalDescription: campaign.internalDescription,
      customerDescription: campaign.customerDescription,
      discountType: campaign.discountType,
      discountValue: campaign.discountValue,
      maxDiscountAmount: campaign.maxDiscountAmount ?? rules.maxDiscountAmount,
      minOrderValue: campaign.minOrderValue ?? rules.minOrderValue,
      budgetMode: budget.mode,
      issuedLimit: campaign.usageLimit ?? budget.issuedLimit,
      maxBudget: campaign.budget ?? budget.maxBudget,
      validDaysAfterIssue: rules.validDaysAfterIssue,
      maxUsesPerCustomer: rules.maxUsesPerCustomer,
      stackable: rules.stackable,
      audienceType: campaign.audienceType,
      channels: campaign.channels,
      issueMethods: publishing.issueMethods,
    } as Partial<VoucherDraft>);
    const snapshot = workspace.session?.snapshot as VoucherBusinessSnapshot | undefined;
    return NextResponse.json({
      campaignId,
      sessionId: workspace.sessionId,
      messages: workspace.messages,
      draft,
      snapshot: snapshot ?? null,
      scenarios: snapshot ? simulateVoucherScenarios(draft, snapshot) : [],
      modelTier: workspace.session?.lastModelTier ?? null,
    });
  } catch (error) {
    console.error("Failed to load voucher AI workspace:", error);
    return NextResponse.json({ error: "Không thể khôi phục phiên AI." }, { status: 500 });
  }
}
