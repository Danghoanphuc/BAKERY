import { describe, expect, it } from "vitest";
import { defaultVoucherDraft } from "@/app/wholesale/vouchers/_lib/voucher-admin";
import { normalizeVoucherDraft, selectVoucherModelTier } from "./voucher-ai-service";

describe("normalizeVoucherDraft", () => {
  it("sanitizes AI controlled values and keeps a valid draft", () => {
    const result = normalizeVoucherDraft({
      ...defaultVoucherDraft,
      code: " new 50! ",
      discountType: "percent",
      discountValue: 180,
      issuedLimit: -2,
      channels: [],
      status: "active",
    });

    expect(result.code).toBe("NEW50");
    expect(result.discountValue).toBe(100);
    expect(result.issuedLimit).toBe(1);
    expect(result.channels).toEqual(defaultVoucherDraft.channels);
    expect(result.status).toBe("draft");
  });

  it("removes unsupported channels and duplicate issue methods", () => {
    const result = normalizeVoucherDraft({
      ...defaultVoucherDraft,
      channels: ["web_delivery", "invalid" as "web_delivery"],
      issueMethods: ["public", "public"],
    });

    expect(result.channels).toEqual(["web_delivery"]);
    expect(result.issueMethods).toEqual(["public"]);
  });
});

describe("selectVoucherModelTier", () => {
  it("honors explicit modes and can disable Sol", () => {
    const base = { messages: [{ role: "user" as const, content: "Tạo voucher" }], draft: defaultVoucherDraft };
    expect(selectVoucherModelTier({ ...base, mode: "economy" })).toBe("luna");
    expect(selectVoucherModelTier({ ...base, mode: "balanced" })).toBe("terra");
    expect(selectVoucherModelTier({ ...base, mode: "deep", allowSol: true })).toBe("sol");
    expect(selectVoucherModelTier({ ...base, mode: "deep", allowSol: false })).toBe("terra");
  });

  it("escalates risky or complex automatic requests", () => {
    const riskyDraft = { ...defaultVoucherDraft, stackable: true };
    expect(selectVoucherModelTier({
      mode: "auto",
      messages: [{ role: "user", content: "Hãy đánh giá rủi ro" }],
      draft: riskyDraft,
      allowSol: true,
    })).toBe("sol");
  });

  it("uses Luna for simple discovery and Terra after more context", () => {
    expect(selectVoucherModelTier({
      mode: "auto",
      messages: [{ role: "user", content: "Thu hút khách mới" }],
      draft: defaultVoucherDraft,
    })).toBe("luna");
    expect(selectVoucherModelTier({
      mode: "auto",
      messages: [
        { role: "user", content: "Thu hút khách mới" },
        { role: "assistant", content: "Ngân sách bao nhiêu?" },
        { role: "user", content: "Hai triệu đồng" },
      ],
      draft: defaultVoucherDraft,
    })).toBe("terra");
  });
});
