import OpenAI from "openai";
import {
  defaultVoucherDraft,
  type VoucherDraft,
} from "@/app/wholesale/vouchers/_lib/voucher-admin";
import {
  voucherAiReplySchema,
  type VoucherAiMessage,
  type VoucherAiMode,
  type VoucherAiModelTier,
  type VoucherAiReply,
} from "./voucher-ai-contract";
import type { VoucherBusinessSnapshot, VoucherScenario } from "./voucher-business-context";
import { openAiFetch } from "./openai-fetch";

const models: Record<VoucherAiModelTier, string> = {
  luna: "gpt-5.6-luna",
  terra: process.env.OPENAI_VOUCHER_MODEL || "gpt-5.6-terra",
  sol: "gpt-5.6-sol",
};

const instructions = `Bạn là chuyên viên marketing cho một tiệm bánh Việt Nam.
Mục tiêu là dẫn dắt quản trị viên tạo voucher hiệu quả, an toàn và dễ hiểu.

Nguyên tắc hội thoại:
- Mỗi lượt chỉ hỏi một câu quan trọng nhất còn thiếu. Viết tiếng Việt tự nhiên, ngắn gọn.
- Ưu tiên hỏi: mục tiêu, ngân sách, giá trị đơn trung bình, thời gian chạy, kênh sử dụng.
- Khi đã đủ bối cảnh, đề xuất ba hướng: An toàn, Cân bằng, Tăng trưởng mạnh; dùng quickReplies để người dùng chọn.
- Luôn trả lại toàn bộ draft, kể cả khi chỉ đổi một field. changedFields liệt kê field thực sự đã đổi.
- Không tự phát hành. status luôn là draft.
- Không tuyên bố chắc chắn doanh thu. Nêu cảnh báo khi mức giảm cao, đơn tối thiểu thấp, ngân sách thiếu giới hạn hoặc cho phép cộng dồn.
- Mã voucher chỉ gồm A-Z, 0-9, dấu gạch ngang; ngắn, dễ đọc.
- Nội dung cho khách phải rõ mức giảm, trần giảm và đơn tối thiểu nếu có.
- Phép tính chính xác do hệ thống thực hiện; bạn chỉ tư vấn cấu hình.
- Dùng snapshot và kết quả mô phỏng được cung cấp để đưa insight cụ thể, không bịa số liệu.
- Nếu dữ liệu chưa đủ, nói rõ đó là giả định. Chủ động phản biện cấu hình có thể gây lỗ.
- completeness phản ánh mức đủ thông tin từ 0-100. readyToReview chỉ true khi mục tiêu, ưu đãi, ngân sách, đối tượng và kênh đều hợp lý.`;

export async function createVoucherAiReply(input: {
  messages: VoucherAiMessage[];
  draft: VoucherDraft;
  modelTier?: VoucherAiModelTier;
  snapshot?: VoucherBusinessSnapshot;
  scenarios?: VoucherScenario[];
}): Promise<VoucherAiReply> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");

  const client = new OpenAI({
    apiKey,
    fetch: openAiFetch,
    maxRetries: 2,
    timeout: 30_000,
  });
  const conversation = input.messages
    .slice(-12)
    .map((message) => `${message.role === "user" ? "Quản trị viên" : "Trợ lý"}: ${message.content}`)
    .join("\n");

  const response = await client.responses.create({
    model: models[input.modelTier || "terra"],
    reasoning: { effort: "low" },
    max_output_tokens: 2200,
    instructions,
    input: `Bản nháp hiện tại:\n${JSON.stringify(input.draft)}

Snapshot kinh doanh ${input.snapshot?.periodDays ?? 0} ngày:\n${JSON.stringify(input.snapshot ?? {})}

Mô phỏng deterministic (chỉ dùng như dữ liệu tham khảo, không tự sửa con số):\n${JSON.stringify(input.scenarios ?? [])}

Hội thoại:\n${conversation}`,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "voucher_ai_reply",
        strict: true,
        schema: voucherAiReplySchema,
      },
    },
  });

  if (!response.output_text) throw new Error("OPENAI_EMPTY_RESPONSE");
  const parsed = JSON.parse(response.output_text) as VoucherAiReply;
  return normalizeVoucherAiReply(parsed, input.draft);
}

export function selectVoucherModelTier(input: {
  mode?: VoucherAiMode;
  messages: VoucherAiMessage[];
  draft: VoucherDraft;
  allowSol?: boolean;
}): VoucherAiModelTier {
  const allowSol = input.allowSol ?? process.env.OPENAI_VOUCHER_ALLOW_SOL !== "false";
  if (input.mode === "economy") return "luna";
  if (input.mode === "balanced") return "terra";
  if (input.mode === "deep") return allowSol ? "sol" : "terra";

  const latest = input.messages[input.messages.length - 1]?.content.toLocaleLowerCase("vi") || "";
  const deepSignals = [
    "phân tích kỹ", "chuyên sâu", "tối ưu", "so sánh chiến lược",
    "đánh giá rủi ro", "nhiều điều kiện", "nhiều chi nhánh",
  ];
  const highRiskDraft =
    input.draft.stackable ||
    (input.draft.discountType === "percent" && input.draft.discountValue > 50) ||
    input.draft.maxBudget >= 50_000_000;
  if (allowSol && (highRiskDraft || deepSignals.some((signal) => latest.includes(signal)))) {
    return "sol";
  }

  const needsStrategy =
    input.messages.filter((message) => message.role === "user").length >= 2 ||
    /phương án|ngân sách|đối tượng|chiến dịch|campaign/.test(latest);
  return needsStrategy ? "terra" : "luna";
}

export function normalizeVoucherDraft(
  candidate: Partial<VoucherDraft> | null | undefined,
  fallback: VoucherDraft = defaultVoucherDraft,
): VoucherDraft {
  const value = { ...fallback, ...(candidate || {}) };
  const allowed = <T extends string>(current: unknown, values: readonly T[], defaultValue: T) =>
    typeof current === "string" && values.includes(current as T) ? current as T : defaultValue;
  const amount = (current: unknown, defaultValue: number, minimum = 0) => {
    const parsed = typeof current === "number" && Number.isFinite(current) ? current : defaultValue;
    return Math.max(minimum, Math.round(parsed));
  };
  const text = (current: unknown, defaultValue: string, max: number) =>
    (typeof current === "string" ? current : defaultValue).trim().slice(0, max);

  const channels = Array.isArray(value.channels)
    ? value.channels.filter((item): item is VoucherDraft["channels"][number] =>
        ["pos_pickup_now", "web_pickup_later", "web_delivery"].includes(item))
    : fallback.channels;
  const issueMethods = Array.isArray(value.issueMethods)
    ? value.issueMethods.filter((item): item is VoucherDraft["issueMethods"][number] =>
        ["public", "auto_after_order", "manual_phone", "segment", "print"].includes(item))
    : fallback.issueMethods;

  const discountType = allowed(value.discountType,
    ["percent", "amount", "gift_item", "free_shipping", "buy_x_get_y", "points_multiplier"] as const,
    fallback.discountType);
  const discountValue = amount(value.discountValue, fallback.discountValue);

  return {
    programGoal: allowed(value.programGoal, ["new_customer", "returning_customer", "birthday", "preorder", "happy_hour", "custom"] as const, fallback.programGoal),
    name: text(value.name, fallback.name, 100),
    code: text(value.code, fallback.code, 32).toUpperCase().replace(/[^A-Z0-9-]/g, ""),
    internalDescription: text(value.internalDescription, fallback.internalDescription, 500),
    customerDescription: text(value.customerDescription, fallback.customerDescription, 500),
    status: "draft",
    discountType,
    discountValue: discountType === "percent" ? Math.min(discountValue, 100) : discountValue,
    maxDiscountAmount: amount(value.maxDiscountAmount, fallback.maxDiscountAmount),
    minOrderValue: amount(value.minOrderValue, fallback.minOrderValue),
    budgetMode: allowed(value.budgetMode, ["quantity", "budget", "both"] as const, fallback.budgetMode),
    issuedLimit: amount(value.issuedLimit, fallback.issuedLimit, 1),
    maxBudget: amount(value.maxBudget, fallback.maxBudget),
    validDaysAfterIssue: amount(value.validDaysAfterIssue, fallback.validDaysAfterIssue, 1),
    maxUsesPerCustomer: amount(value.maxUsesPerCustomer, fallback.maxUsesPerCustomer, 1),
    stackable: typeof value.stackable === "boolean" ? value.stackable : fallback.stackable,
    audienceType: allowed(value.audienceType, ["all", "new_customers", "existing_customers", "inactive_customers", "birthday_customers", "specific_customers", "after_purchase"] as const, fallback.audienceType),
    channels: [...new Set(channels.length ? channels : fallback.channels)],
    issueMethods: [...new Set(issueMethods.length ? issueMethods : fallback.issueMethods)],
  };
}

export function normalizeVoucherAiReply(reply: VoucherAiReply, fallback: VoucherDraft): VoucherAiReply {
  return {
    message: String(reply.message || "Mình cần thêm một chút thông tin để tiếp tục.").slice(0, 1000),
    phase: ["discovery", "proposal", "refinement", "review"].includes(reply.phase) ? reply.phase : "discovery",
    quickReplies: Array.isArray(reply.quickReplies) ? reply.quickReplies.map(String).slice(0, 4) : [],
    draft: normalizeVoucherDraft(reply.draft, fallback),
    changedFields: Array.isArray(reply.changedFields) ? reply.changedFields.map(String).slice(0, 20) : [],
    warnings: Array.isArray(reply.warnings) ? reply.warnings.map(String).slice(0, 5) : [],
    completeness: Math.min(100, Math.max(0, Number(reply.completeness) || 0)),
    readyToReview: Boolean(reply.readyToReview),
  };
}
