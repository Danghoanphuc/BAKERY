import type { VoucherDraft } from "@/app/wholesale/vouchers/_lib/voucher-admin";
import type { VoucherBusinessSnapshot, VoucherScenario } from "./voucher-business-context";

export type VoucherAiRole = "user" | "assistant";
export type VoucherAiMode = "auto" | "economy" | "balanced" | "deep";
export type VoucherAiModelTier = "luna" | "terra" | "sol";

export type VoucherAiMessage = {
  role: VoucherAiRole;
  content: string;
};

export type VoucherAiReply = {
  message: string;
  phase: "discovery" | "proposal" | "refinement" | "review";
  quickReplies: string[];
  draft: VoucherDraft;
  changedFields: string[];
  warnings: string[];
  completeness: number;
  readyToReview: boolean;
};

export type VoucherAiRequest = {
  messages: VoucherAiMessage[];
  draft: VoucherDraft;
  mode?: VoucherAiMode;
  campaignId?: string | null;
  sessionId?: string | null;
};

export type VoucherAiResponse = VoucherAiReply & {
  modelTier: VoucherAiModelTier;
  campaignId: string;
  sessionId: string;
  snapshot: VoucherBusinessSnapshot;
  scenarios: VoucherScenario[];
};

const string = { type: "string" } as const;
const number = { type: "number", minimum: 0 } as const;

export const voucherAiReplySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "message",
    "phase",
    "quickReplies",
    "draft",
    "changedFields",
    "warnings",
    "completeness",
    "readyToReview",
  ],
  properties: {
    message: string,
    phase: {
      type: "string",
      enum: ["discovery", "proposal", "refinement", "review"],
    },
    quickReplies: { type: "array", items: string, maxItems: 4 },
    changedFields: { type: "array", items: string },
    warnings: { type: "array", items: string, maxItems: 5 },
    completeness: { type: "number", minimum: 0, maximum: 100 },
    readyToReview: { type: "boolean" },
    draft: {
      type: "object",
      additionalProperties: false,
      required: [
        "programGoal", "name", "code", "internalDescription",
        "customerDescription", "status", "discountType", "discountValue",
        "maxDiscountAmount", "minOrderValue", "budgetMode", "issuedLimit",
        "maxBudget", "validDaysAfterIssue", "maxUsesPerCustomer", "stackable",
        "audienceType", "channels", "issueMethods",
      ],
      properties: {
        programGoal: { type: "string", enum: ["new_customer", "returning_customer", "birthday", "preorder", "happy_hour", "custom"] },
        name: string,
        code: string,
        internalDescription: string,
        customerDescription: string,
        status: { type: "string", enum: ["draft"] },
        discountType: { type: "string", enum: ["percent", "amount", "gift_item", "free_shipping", "buy_x_get_y", "points_multiplier"] },
        discountValue: number,
        maxDiscountAmount: number,
        minOrderValue: number,
        budgetMode: { type: "string", enum: ["quantity", "budget", "both"] },
        issuedLimit: { type: "number", minimum: 1 },
        maxBudget: number,
        validDaysAfterIssue: { type: "number", minimum: 1 },
        maxUsesPerCustomer: { type: "number", minimum: 1 },
        stackable: { type: "boolean" },
        audienceType: { type: "string", enum: ["all", "new_customers", "existing_customers", "inactive_customers", "birthday_customers", "specific_customers", "after_purchase"] },
        channels: { type: "array", items: { type: "string", enum: ["pos_pickup_now", "web_pickup_later", "web_delivery"] }, minItems: 1 },
        issueMethods: { type: "array", items: { type: "string", enum: ["public", "auto_after_order", "manual_phone", "segment", "print"] }, minItems: 1 },
      },
    },
  },
} as const;
