import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import type { VoucherDraft } from "@/app/(admin)/admin/vouchers/_lib/voucher-admin";
import type { VoucherAiMessage, VoucherAiModelTier } from "./voucher-ai-contract";
import type { VoucherBusinessSnapshot, VoucherScenario } from "./voucher-business-context";

const CAMPAIGNS = "marketing_campaigns";

export async function ensureVoucherAiWorkspace(input: {
  campaignId?: string | null;
  sessionId?: string | null;
  draft: VoucherDraft;
  snapshot: VoucherBusinessSnapshot;
}) {
  const db = getAdminFirestore();
  const campaignId = input.campaignId || randomUUID();
  const sessionId = input.sessionId || randomUUID();
  const campaignRef = db.collection(CAMPAIGNS).doc(campaignId);
  const campaignDoc = await campaignRef.get();
  if (!campaignDoc.exists) {
    await campaignRef.set({
      name: input.draft.name, title: input.draft.name, type: "voucher", status: "draft",
      code: input.draft.code, description: input.draft.customerDescription,
      internalDescription: input.draft.internalDescription,
      customerDescription: input.draft.customerDescription,
      discountType: input.draft.discountType, discountValue: input.draft.discountValue,
      minOrderValue: input.draft.minOrderValue, maxDiscountAmount: input.draft.maxDiscountAmount,
      budget: input.draft.maxBudget, usageLimit: input.draft.issuedLimit, usedCount: 0,
      audience: input.draft.audienceType, audienceType: input.draft.audienceType,
      channel: input.draft.channels.join(", "), channels: input.draft.channels,
      programGoal: input.draft.programGoal,
      rules: { maxDiscountAmount: input.draft.maxDiscountAmount, minOrderValue: input.draft.minOrderValue, applicationScope: "entire_order", validDaysAfterIssue: input.draft.validDaysAfterIssue, maxUsesPerCustomer: input.draft.maxUsesPerCustomer, stackable: input.draft.stackable },
      voucherBudget: { mode: input.draft.budgetMode, issuedLimit: input.draft.issuedLimit, maxBudget: input.draft.maxBudget, maxDiscountPerVoucher: input.draft.maxDiscountAmount },
      publishing: { issueMethods: input.draft.issueMethods, isPublic: input.draft.issueMethods.includes("public"), autoIssueAfterOrder: input.draft.issueMethods.includes("auto_after_order"), printOnBill: input.draft.issueMethods.includes("print") },
      aiStrategy: { objective: input.draft.programGoal, dataSnapshot: input.snapshot, lastSummary: "Đang xây dựng chiến lược", lastModelTier: null },
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
  }
  const sessionRef = campaignRef.collection("ai_sessions").doc(sessionId);
  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    await sessionRef.set({ status: "active", snapshot: input.snapshot, startedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), messageCount: 0 });
  }
  return { campaignId, sessionId, snapshot: (sessionDoc.data()?.snapshot as VoucherBusinessSnapshot | undefined) ?? input.snapshot };
}

export async function persistVoucherAiTurn(input: {
  campaignId: string; sessionId: string; userMessage: VoucherAiMessage;
  assistantMessage: VoucherAiMessage; draft: VoucherDraft; modelTier: VoucherAiModelTier;
  summary: string; warnings: string[]; scenarios: VoucherScenario[];
}) {
  const db = getAdminFirestore();
  const campaignRef = db.collection(CAMPAIGNS).doc(input.campaignId);
  const sessionRef = campaignRef.collection("ai_sessions").doc(input.sessionId);
  const batch = db.batch();
  for (const message of [input.userMessage, input.assistantMessage]) {
    const ref = sessionRef.collection("messages").doc(randomUUID());
    batch.set(ref, { ...message, modelTier: message.role === "assistant" ? input.modelTier : null, createdAt: FieldValue.serverTimestamp() });
  }
  batch.set(sessionRef, { updatedAt: FieldValue.serverTimestamp(), lastModelTier: input.modelTier, messageCount: FieldValue.increment(2) }, { merge: true });
  const selectedScenario = input.scenarios.find((scenario) =>
    input.userMessage.content.toLocaleLowerCase("vi").includes(`phương án ${scenario.label.toLocaleLowerCase("vi")}`));
  batch.update(campaignRef, {
    "aiStrategy.objective": input.draft.programGoal,
    "aiStrategy.warnings": input.warnings,
    "aiStrategy.lastSummary": input.summary,
    "aiStrategy.lastModelTier": input.modelTier,
    "aiStrategy.scenarios": input.scenarios,
    "aiStrategy.proposedDraft": input.draft,
    ...(selectedScenario ? { "aiStrategy.selectedApproach": selectedScenario.id } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

export async function loadVoucherAiWorkspace(campaignId: string) {
  const db = getAdminFirestore();
  const campaignRef = db.collection(CAMPAIGNS).doc(campaignId);
  const [campaignDoc, sessions] = await Promise.all([
    campaignRef.get(),
    campaignRef.collection("ai_sessions").orderBy("updatedAt", "desc").limit(1).get(),
  ]);
  if (!campaignDoc.exists) return null;
  const sessionDoc = sessions.docs[0];
  const messageDocs = sessionDoc
    ? await sessionDoc.ref.collection("messages").orderBy("createdAt", "asc").limit(50).get()
    : null;
  return {
    campaignId,
    campaign: campaignDoc.data() as Record<string, unknown>,
    sessionId: sessionDoc?.id ?? null,
    session: sessionDoc?.data() as Record<string, unknown> | undefined,
    messages: messageDocs?.docs.map((doc) => {
      const data = doc.data();
      return { role: data.role, content: data.content } as VoucherAiMessage;
    }) ?? [],
  };
}
