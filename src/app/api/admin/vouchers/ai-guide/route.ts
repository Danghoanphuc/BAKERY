import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createVoucherAiReply, normalizeVoucherDraft, selectVoucherModelTier } from "@/features/admin/vouchers/ai/voucher-ai-service";
import type { VoucherAiMode, VoucherAiRequest } from "@/features/admin/vouchers/ai/voucher-ai-contract";
import { loadVoucherBusinessSnapshot, simulateVoucherScenarios } from "@/features/admin/vouchers/ai/voucher-business-context";
import { ensureVoucherAiWorkspace, persistVoucherAiTurn } from "@/features/admin/vouchers/ai/voucher-ai-repository";
import { classifyOpenAiFailure } from "@/features/admin/vouchers/ai/openai-error";

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as VoucherAiRequest | null;
  if (!body || !Array.isArray(body.messages) || !body.draft) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 });
  }

  const messages = body.messages
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .slice(-12)
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 1000) }));
  if (!messages.length || messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Hãy gửi câu trả lời của bạn để tiếp tục." }, { status: 400 });
  }

  try {
    const allowedModes: VoucherAiMode[] = ["auto", "economy", "balanced", "deep"];
    const mode = allowedModes.includes(body.mode as VoucherAiMode)
      ? body.mode as VoucherAiMode
      : "auto";
    const draft = normalizeVoucherDraft(body.draft);
    const freshSnapshot = await loadVoucherBusinessSnapshot();
    const workspace = await ensureVoucherAiWorkspace({
      campaignId: body.campaignId,
      sessionId: body.sessionId,
      draft,
      snapshot: freshSnapshot,
    });
    const scenarios = simulateVoucherScenarios(draft, workspace.snapshot);
    const modelTier = selectVoucherModelTier({ mode, messages, draft });
    const reply = await createVoucherAiReply({
      messages,
      draft,
      modelTier,
      snapshot: workspace.snapshot,
      scenarios,
    });
    const updatedScenarios = simulateVoucherScenarios(reply.draft, workspace.snapshot);
    await persistVoucherAiTurn({
      campaignId: workspace.campaignId,
      sessionId: workspace.sessionId,
      userMessage: messages[messages.length - 1],
      assistantMessage: { role: "assistant", content: reply.message },
      draft: reply.draft,
      modelTier,
      summary: reply.message,
      warnings: reply.warnings,
      scenarios: updatedScenarios,
    });
    return NextResponse.json({
      ...reply,
      modelTier,
      campaignId: workspace.campaignId,
      sessionId: workspace.sessionId,
      snapshot: workspace.snapshot,
      scenarios: updatedScenarios,
    });
  } catch (error) {
    console.error("Voucher AI guide failed:", error);
    const failure = classifyOpenAiFailure(error);
    if (failure === "configuration") {
      return NextResponse.json({ error: "Trợ lý AI chưa được cấu hình trên máy chủ." }, { status: 503 });
    }
    if (failure === "network") {
      return NextResponse.json(
        { error: "Không thể kết nối OpenAI. Hãy kiểm tra Internet/DNS của máy chủ rồi thử lại; phiên và bản nháp vẫn được giữ nguyên." },
        { status: 503 },
      );
    }
    if (failure === "quota") {
      return NextResponse.json(
        { error: "Tài khoản OpenAI API đã hết hạn mức hoặc chưa bật thanh toán." },
        { status: 503 },
      );
    }
    if (failure === "authentication") {
      return NextResponse.json({ error: "OpenAI API key không hợp lệ hoặc không thuộc project đang thanh toán." }, { status: 503 });
    }
    if (failure === "model") {
      return NextResponse.json({ error: "Model OpenAI đang cấu hình không tồn tại hoặc project chưa được cấp quyền." }, { status: 503 });
    }
    return NextResponse.json({ error: "Trợ lý AI đang bận. Bản nháp của bạn vẫn được giữ nguyên." }, { status: 502 });
  }
}
