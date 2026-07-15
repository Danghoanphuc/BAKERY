import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingSettings,
  MarketingSettingsInput,
  TierSetting,
  VoucherAudience,
  VoucherBudgetMode,
  VoucherIssueMethod,
  VoucherProgramGoal,
  VoucherUseChannel,
} from "@/types";
import { db } from "./config";

const CAMPAIGNS_COLLECTION = "marketing_campaigns";
const SETTINGS_COLLECTION = "marketing_settings";
const SETTINGS_DOC_ID = "loyalty";
const VOUCHER_REDEMPTIONS_COLLECTION = "voucher_redemptions";
const VOUCHER_ISSUES_COLLECTION = "voucher_issues";
const VOUCHER_AUDIT_COLLECTION = "voucher_audit_logs";
const VOUCHER_VERSIONS_COLLECTION = "voucher_campaign_versions";

export interface VoucherRedemptionInput {
  voucherId?: string;
  voucherCode?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  phone?: string;
  channel?: VoucherUseChannel;
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  source: "checkout" | "pos";
}

export interface VoucherRedemption {
  id: string;
  voucherId?: string;
  voucherCode?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  phone?: string;
  channel?: VoucherUseChannel;
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  source?: "checkout" | "pos";
  createdAt?: Date;
}

export interface VoucherIssue {
  id: string;
  campaignId: string;
  campaignVersionId?: string;
  customerId?: string;
  phone?: string;
  issueMethod: string;
  status: "available" | "redeemed" | "expired" | "revoked";
  note?: string;
  actor?: string;
  issuedAt?: Date;
  expiresAt?: Date;
}

export interface VoucherAuditEntry {
  id: string;
  campaignId: string;
  action: string;
  actor: string;
  reason?: string;
  changedFields: string[];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt?: Date;
}

export interface VoucherCampaignVersion {
  id: string;
  campaignId: string;
  version: number;
  configuration: Record<string, unknown>;
  actor: string;
  reason?: string;
  createdAt?: Date;
}

const defaultTiers: TierSetting[] = [
  {
    id: "wheat",
    name: "Hạt Lúa Mì",
    threshold: 0,
    icon: "🌾",
    benefit: "Mở khóa hồ sơ tích điểm",
  },
  {
    id: "devotee",
    name: "Tín Đồ Hảo Ngọt",
    threshold: 550,
    icon: "🍪",
    benefit: "Voucher giảm 10%",
  },
  {
    id: "taster",
    name: "Chuyên Gia Nếm Thử",
    threshold: 1200,
    icon: "🥐",
    benefit: "Ưu tiên món mới",
  },
  {
    id: "chef",
    name: "Bếp Trưởng Danh Dự",
    threshold: 2350,
    icon: "👑",
    benefit: "Voucher giảm 20%",
  },
];

export const defaultMarketingSettings: MarketingSettings = {
  id: SETTINGS_DOC_ID,
  pointsPerAmount: 10000,
  birthdayVoucherEnabled: true,
  birthdayVoucherTitle: "Quà sinh nhật",
  birthdayVoucherDescription: "Áp dụng khi hồ sơ có ngày sinh",
  tiers: defaultTiers,
};

type FirestoreDateValue =
  | Date
  | string
  | number
  | { seconds: number; toDate?: () => Date }
  | undefined
  | null;

function toDate(value: FirestoreDateValue): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  if (typeof value === "object") {
    if (typeof value.toDate === "function") return value.toDate();
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  }

  return undefined;
}

function cleanDate(value?: Date | string) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;
}

function normalizeCampaign(
  id: string,
  data: Record<string, unknown>,
): MarketingCampaign {
  const minOrderValue =
    typeof data.minOrderValue === "number" ? data.minOrderValue : undefined;
  const maxDiscountAmount =
    typeof data.maxDiscountAmount === "number"
      ? data.maxDiscountAmount
      : undefined;
  const usageLimit =
    typeof data.usageLimit === "number" ? data.usageLimit : undefined;
  const budget = typeof data.budget === "number" ? data.budget : undefined;
  const issuedCount =
    typeof data.issuedCount === "number" ? data.issuedCount : 0;
  const redeemedCount =
    typeof data.redeemedCount === "number"
      ? data.redeemedCount
      : typeof data.usedCount === "number"
        ? data.usedCount
        : 0;
  const discountSpent =
    typeof data.discountSpent === "number" ? data.discountSpent : 0;
  const revenueGenerated =
    typeof data.revenueGenerated === "number" ? data.revenueGenerated : 0;

  return {
    id,
    name: String(data.name ?? ""),
    type:
      data.type === "voucher" || data.type === "loyalty"
        ? data.type
        : "campaign",
    status:
      data.status === "active" ||
      data.status === "scheduled" ||
      data.status === "paused" ||
      data.status === "expired" ||
      data.status === "completed" ||
      data.status === "archived"
        ? data.status
        : "draft",
    code: typeof data.code === "string" ? data.code : undefined,
    codePrefix:
      typeof data.codePrefix === "string" ? data.codePrefix : undefined,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    internalDescription:
      typeof data.internalDescription === "string"
        ? data.internalDescription
        : undefined,
    customerDescription:
      typeof data.customerDescription === "string"
        ? data.customerDescription
        : typeof data.description === "string"
          ? data.description
          : undefined,
    audience: String(data.audience ?? "Tất cả khách hàng"),
    audienceType:
      typeof data.audienceType === "string"
        ? (data.audienceType as VoucherAudience)
        : undefined,
    channel: String(data.channel ?? "Ứng dụng"),
    channels: asStringArray(data.channels) as VoucherUseChannel[] | undefined,
    startDate: toDate(data.startDate as FirestoreDateValue),
    endDate: toDate(data.endDate as FirestoreDateValue),
    budget,
    discountType:
      data.discountType === "amount" ||
      data.discountType === "gift_item" ||
      data.discountType === "free_shipping" ||
      data.discountType === "buy_x_get_y" ||
      data.discountType === "points_multiplier"
        ? data.discountType
        : "percent",
    discountValue:
      typeof data.discountValue === "number" ? data.discountValue : 0,
    giftProductId:
      typeof data.giftProductId === "string" ? data.giftProductId : undefined,
    buyQuantity:
      typeof data.buyQuantity === "number" ? data.buyQuantity : undefined,
    getQuantity:
      typeof data.getQuantity === "number" ? data.getQuantity : undefined,
    minOrderValue,
    maxDiscountAmount,
    usageLimit,
    usedCount: redeemedCount,
    pointsMultiplier:
      typeof data.pointsMultiplier === "number"
        ? data.pointsMultiplier
        : undefined,
    isFeatured:
      typeof data.isFeatured === "boolean" ? data.isFeatured : false,
    programGoal:
      typeof data.programGoal === "string"
        ? (data.programGoal as VoucherProgramGoal)
        : undefined,
    rules:
      data.rules && typeof data.rules === "object"
        ? (data.rules as MarketingCampaign["rules"])
        : {
            maxDiscountAmount,
            minOrderValue,
            applicationScope: "entire_order",
            validDaysAfterIssue:
              typeof data.validDaysAfterIssue === "number"
                ? data.validDaysAfterIssue
                : undefined,
            maxUsesPerCustomer:
              typeof data.maxUsesPerCustomer === "number"
                ? data.maxUsesPerCustomer
                : 1,
            stackable:
              typeof data.stackable === "boolean" ? data.stackable : false,
          },
    voucherBudget:
      data.voucherBudget && typeof data.voucherBudget === "object"
        ? (data.voucherBudget as MarketingCampaign["voucherBudget"])
        : {
            mode: (data.budgetMode as VoucherBudgetMode) ?? "both",
            issuedLimit: usageLimit,
            maxBudget: budget,
            maxDiscountPerVoucher: maxDiscountAmount,
          },
    metrics:
      data.metrics && typeof data.metrics === "object"
        ? (data.metrics as MarketingCampaign["metrics"])
        : {
            issuedCount,
            redeemedCount,
            discountSpent,
            revenueGenerated,
          },
    publishing:
      data.publishing && typeof data.publishing === "object"
        ? (data.publishing as MarketingCampaign["publishing"])
        : {
            issueMethods:
              (asStringArray(data.issueMethods) as VoucherIssueMethod[]) ?? [],
            isPublic: Boolean(data.isPublic),
            autoIssueAfterOrder: Boolean(data.autoIssueAfterOrder),
            printOnBill: Boolean(data.printOnBill),
          },
    aiStrategy:
      data.aiStrategy && typeof data.aiStrategy === "object"
        ? (data.aiStrategy as MarketingCampaign["aiStrategy"])
        : undefined,
    activeVersionId: typeof data.activeVersionId === "string" ? data.activeVersionId : undefined,
    version: typeof data.version === "number" ? data.version : undefined,
    createdAt: toDate(data.createdAt as FirestoreDateValue),
    updatedAt: toDate(data.updatedAt as FirestoreDateValue),
  };
}

function normalizeSettings(
  id: string,
  data: Record<string, unknown>,
): MarketingSettings {
  return {
    id,
    pointsPerAmount:
      typeof data.pointsPerAmount === "number"
        ? data.pointsPerAmount
        : defaultMarketingSettings.pointsPerAmount,
    birthdayVoucherEnabled:
      typeof data.birthdayVoucherEnabled === "boolean"
        ? data.birthdayVoucherEnabled
        : defaultMarketingSettings.birthdayVoucherEnabled,
    birthdayVoucherTitle:
      typeof data.birthdayVoucherTitle === "string"
        ? data.birthdayVoucherTitle
        : defaultMarketingSettings.birthdayVoucherTitle,
    birthdayVoucherDescription:
      typeof data.birthdayVoucherDescription === "string"
        ? data.birthdayVoucherDescription
        : defaultMarketingSettings.birthdayVoucherDescription,
    tiers: Array.isArray(data.tiers)
      ? (data.tiers as TierSetting[])
      : defaultMarketingSettings.tiers,
    updatedAt: toDate(data.updatedAt as FirestoreDateValue),
  };
}

function buildCampaignPayload(data: Partial<MarketingCampaignInput>) {
  return stripUndefined({
    name: data.name?.trim(),
    type: data.type,
    status: data.status,
    code: data.code?.trim().toUpperCase() || undefined,
    codePrefix: data.codePrefix?.trim().toUpperCase() || undefined,
    title: data.title?.trim(),
    description: data.description?.trim(),
    internalDescription: data.internalDescription?.trim(),
    customerDescription: data.customerDescription?.trim(),
    audience: data.audience?.trim(),
    audienceType: data.audienceType,
    channel: data.channel?.trim(),
    channels: data.channels,
    startDate: cleanDate(data.startDate),
    endDate: cleanDate(data.endDate),
    budget: data.budget,
    discountType: data.discountType,
    discountValue: data.discountValue,
    giftProductId: data.giftProductId,
    buyQuantity: data.buyQuantity,
    getQuantity: data.getQuantity,
    minOrderValue: data.minOrderValue,
    maxDiscountAmount: data.maxDiscountAmount,
    usageLimit: data.usageLimit,
    usedCount: data.usedCount,
    pointsMultiplier: data.pointsMultiplier,
    isFeatured: data.isFeatured,
    programGoal: data.programGoal,
    rules: data.rules,
    voucherBudget: data.voucherBudget,
    metrics: data.metrics,
    publishing: data.publishing,
    aiStrategy: data.aiStrategy,
  });
}

export async function getMarketingCampaigns(): Promise<MarketingCampaign[]> {
  try {
    const campaignsRef = collection(db, CAMPAIGNS_COLLECTION);
    const campaignsQuery = query(campaignsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(campaignsQuery);

    return snapshot.docs.map((campaignDoc) =>
      normalizeCampaign(campaignDoc.id, campaignDoc.data()),
    );
  } catch (error) {
    console.error("Error fetching marketing campaigns:", error);
    return [];
  }
}

export async function createMarketingCampaign(
  data: MarketingCampaignInput,
): Promise<MarketingCampaign> {
  const payload = {
    ...buildCampaignPayload(data),
    usedCount: data.usedCount ?? data.metrics?.redeemedCount ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const campaignRef = await addDoc(
    collection(db, CAMPAIGNS_COLLECTION),
    payload,
  );

  if (data.type === "voucher") {
    await updateVoucherCampaignLifecycle({
      campaignId: campaignRef.id,
      patch: data,
      actor: "admin",
      action: "campaign_created",
      reason: "Tạo campaign voucher",
    });
  }

  return normalizeCampaign(campaignRef.id, {
    ...payload,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updateMarketingCampaign(
  id: string,
  data: Partial<MarketingCampaignInput>,
): Promise<void> {
  await updateDoc(
    doc(db, CAMPAIGNS_COLLECTION, id),
    stripUndefined({
      ...buildCampaignPayload(data),
      updatedAt: serverTimestamp(),
    }),
  );
}

const protectedCampaignFields = new Set([
  "metrics", "issuedCount", "redeemedCount", "discountSpent",
  "revenueGenerated", "usedCount", "createdAt", "activeVersionId", "version",
]);

function withoutProtectedCampaignFields(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !protectedCampaignFields.has(key)));
}

function comparableCampaign(value: Record<string, unknown>) {
  return withoutProtectedCampaignFields(value);
}

export async function updateVoucherCampaignLifecycle(input: {
  campaignId: string;
  patch: Partial<MarketingCampaignInput>;
  actor?: string;
  reason?: string;
  action?: string;
}) {
  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, input.campaignId);
  const versionRef = doc(collection(db, VOUCHER_VERSIONS_COLLECTION));
  const auditRef = doc(collection(db, VOUCHER_AUDIT_COLLECTION));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(campaignRef);
    if (!snapshot.exists()) throw new Error("VOUCHER_CAMPAIGN_NOT_FOUND");
    const before = snapshot.data() as Record<string, unknown>;
    const patch = withoutProtectedCampaignFields(
      stripUndefined(buildCampaignPayload(input.patch) as Record<string, unknown>),
    );
    const nextVersion = (typeof before.version === "number" ? before.version : 0) + 1;
    const after = { ...before, ...patch, version: nextVersion, activeVersionId: versionRef.id };
    const changedFields = Object.keys(patch).filter((key) =>
      JSON.stringify(before[key]) !== JSON.stringify(patch[key]));

    transaction.set(versionRef, {
      campaignId: input.campaignId,
      version: nextVersion,
      configuration: comparableCampaign(after),
      actor: input.actor || "admin",
      reason: input.reason || null,
      createdAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      campaignId: input.campaignId,
      action: input.action || "campaign_updated",
      actor: input.actor || "admin",
      reason: input.reason || null,
      changedFields,
      before: comparableCampaign(before),
      after: comparableCampaign(after),
      createdAt: serverTimestamp(),
    });
    transaction.update(campaignRef, {
      ...patch,
      version: nextVersion,
      activeVersionId: versionRef.id,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function issueVoucherToCustomer(input: {
  issueId: string;
  campaignId: string;
  customerId?: string;
  phone?: string;
  issueMethod: string;
  note?: string;
  actor?: string;
  expiresAt?: Date;
}) {
  const issueRef = doc(db, VOUCHER_ISSUES_COLLECTION, input.issueId);
  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, input.campaignId);
  const auditRef = doc(collection(db, VOUCHER_AUDIT_COLLECTION));

  await runTransaction(db, async (transaction) => {
    const [issueSnapshot, campaignSnapshot] = await Promise.all([
      transaction.get(issueRef), transaction.get(campaignRef),
    ]);
    if (issueSnapshot.exists()) return;
    if (!campaignSnapshot.exists()) throw new Error("VOUCHER_CAMPAIGN_NOT_FOUND");
    const campaign = campaignSnapshot.data();
    transaction.set(issueRef, stripUndefined({
      campaignId: input.campaignId,
      campaignVersionId: typeof campaign.activeVersionId === "string" ? campaign.activeVersionId : undefined,
      customerId: input.customerId,
      phone: input.phone?.replace(/\s+/g, "").trim(),
      issueMethod: input.issueMethod,
      status: "available",
      note: input.note,
      actor: input.actor || "admin",
      issuedAt: serverTimestamp(),
      expiresAt: input.expiresAt,
    }));
    transaction.update(campaignRef, {
      "metrics.issuedCount": increment(1),
      "metrics.availableCount": increment(1),
      issuedCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      campaignId: input.campaignId,
      action: "voucher_issued",
      actor: input.actor || "admin",
      reason: input.note || null,
      changedFields: ["metrics.issuedCount"],
      after: { issueId: input.issueId, customerId: input.customerId || null, issueMethod: input.issueMethod },
      createdAt: serverTimestamp(),
    });
  });
}

export async function getVoucherIssues(campaignId: string): Promise<VoucherIssue[]> {
  const snapshot = await getDocs(query(collection(db, VOUCHER_ISSUES_COLLECTION), where("campaignId", "==", campaignId)));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id, campaignId,
      campaignVersionId: typeof data.campaignVersionId === "string" ? data.campaignVersionId : undefined,
      customerId: typeof data.customerId === "string" ? data.customerId : undefined,
      phone: typeof data.phone === "string" ? data.phone : undefined,
      issueMethod: String(data.issueMethod || "unknown"),
      status: ["redeemed", "expired", "revoked"].includes(data.status) ? data.status : "available",
      note: typeof data.note === "string" ? data.note : undefined,
      actor: typeof data.actor === "string" ? data.actor : undefined,
      issuedAt: toDate(data.issuedAt as FirestoreDateValue),
      expiresAt: toDate(data.expiresAt as FirestoreDateValue),
    } as VoucherIssue;
  }).sort((a, b) => (b.issuedAt?.getTime() ?? 0) - (a.issuedAt?.getTime() ?? 0));
}

export async function getVoucherAuditLog(campaignId: string): Promise<VoucherAuditEntry[]> {
  const snapshot = await getDocs(query(collection(db, VOUCHER_AUDIT_COLLECTION), where("campaignId", "==", campaignId)));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id, campaignId, action: String(data.action || "unknown"), actor: String(data.actor || "system"),
      reason: typeof data.reason === "string" ? data.reason : undefined,
      changedFields: asStringArray(data.changedFields) ?? [],
      before: data.before && typeof data.before === "object" ? data.before as Record<string, unknown> : undefined,
      after: data.after && typeof data.after === "object" ? data.after as Record<string, unknown> : undefined,
      createdAt: toDate(data.createdAt as FirestoreDateValue),
    };
  }).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function getVoucherCampaignVersions(campaignId: string): Promise<VoucherCampaignVersion[]> {
  const snapshot = await getDocs(query(collection(db, VOUCHER_VERSIONS_COLLECTION), where("campaignId", "==", campaignId)));
  return snapshot.docs.map((item) => {
    const data = item.data();
    return {
      id: item.id, campaignId, version: typeof data.version === "number" ? data.version : 1,
      configuration: data.configuration && typeof data.configuration === "object" ? data.configuration as Record<string, unknown> : {},
      actor: String(data.actor || "system"), reason: typeof data.reason === "string" ? data.reason : undefined,
      createdAt: toDate(data.createdAt as FirestoreDateValue),
    };
  }).sort((a, b) => b.version - a.version);
}

export async function recordVoucherRedemption(
  data: VoucherRedemptionInput,
): Promise<void> {
  if (!data.voucherId && !data.voucherCode) return;
  if (!Number.isFinite(data.discountAmount) || data.discountAmount <= 0) return;

  const redemptionPayload = stripUndefined({
      voucherId: data.voucherId,
      voucherCode: data.voucherCode,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      customerId: data.customerId,
      phone: data.phone?.replace(/\s+/g, "").trim(),
      channel: data.channel,
      subtotal: data.subtotal,
      discountAmount: data.discountAmount,
      totalAfterDiscount: data.totalAfterDiscount,
      source: data.source,
      createdAt: serverTimestamp(),
  });

  if (!data.voucherId) {
    await addDoc(collection(db, VOUCHER_REDEMPTIONS_COLLECTION), redemptionPayload);
    return;
  }

  const safeOrderKey = (data.orderId || data.orderNumber || `${Date.now()}`)
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  const redemptionRef = doc(db, VOUCHER_REDEMPTIONS_COLLECTION, `${data.voucherId}_${safeOrderKey}`);
  const campaignRef = doc(db, CAMPAIGNS_COLLECTION, data.voucherId);
  const auditRef = doc(collection(db, VOUCHER_AUDIT_COLLECTION));

  await runTransaction(db, async (transaction) => {
    const [existing, campaignSnapshot] = await Promise.all([
      transaction.get(redemptionRef), transaction.get(campaignRef),
    ]);
    if (existing.exists() || !campaignSnapshot.exists()) return;
    const campaign = campaignSnapshot.data();
    const metrics = campaign.metrics && typeof campaign.metrics === "object"
      ? campaign.metrics as Record<string, unknown> : {};
    const issued = typeof metrics.issuedCount === "number" ? metrics.issuedCount : 0;
    const redeemed = typeof metrics.redeemedCount === "number" ? metrics.redeemedCount : 0;
    const available = typeof metrics.availableCount === "number" ? metrics.availableCount : 0;
    const implicitIssue = issued <= redeemed ? 1 : 0;

    transaction.set(redemptionRef, {
      ...redemptionPayload,
      campaignVersionId: typeof campaign.activeVersionId === "string" ? campaign.activeVersionId : null,
    });
    transaction.update(campaignRef, {
      usedCount: increment(1),
      redeemedCount: increment(1),
      discountSpent: increment(data.discountAmount),
      revenueGenerated: increment(data.totalAfterDiscount),
      "metrics.issuedCount": increment(implicitIssue),
      "metrics.availableCount": increment(available > 0 ? -1 : 0),
      "metrics.redeemedCount": increment(1),
      "metrics.discountSpent": increment(data.discountAmount),
      "metrics.revenueGenerated": increment(data.totalAfterDiscount),
      issuedCount: increment(implicitIssue),
      updatedAt: serverTimestamp(),
    });
    transaction.set(auditRef, {
      campaignId: data.voucherId,
      action: "voucher_redeemed",
      actor: data.customerId ? `customer:${data.customerId}` : data.source,
      changedFields: ["metrics.redeemedCount", "metrics.discountSpent", "metrics.revenueGenerated"],
      after: { orderId: data.orderId || null, discountAmount: data.discountAmount, totalAfterDiscount: data.totalAfterDiscount },
      createdAt: serverTimestamp(),
    });
  });
}

export async function getVoucherRedemptionUsage({
  voucherId,
  voucherCode,
  customerId,
  phone,
}: {
  voucherId?: string;
  voucherCode?: string;
  customerId?: string;
  phone?: string;
}) {
  if (!voucherId && !voucherCode) return 0;
  if (!customerId && !phone) return 0;

  const redemptionsRef = collection(db, VOUCHER_REDEMPTIONS_COLLECTION);
  const redemptionsQuery = query(
    redemptionsRef,
    voucherId
      ? where("voucherId", "==", voucherId)
      : where("voucherCode", "==", voucherCode),
  );
  const normalizedPhone = phone?.replace(/\s+/g, "").trim();
  const snapshot = await getDocs(redemptionsQuery);

  return snapshot.docs.filter((redemptionDoc) => {
    const data = redemptionDoc.data();
    const redemptionPhone =
      typeof data.phone === "string"
        ? data.phone.replace(/\s+/g, "").trim()
        : undefined;

    return (
      (customerId && data.customerId === customerId) ||
      Boolean(normalizedPhone && redemptionPhone === normalizedPhone)
    );
  }).length;
}

function normalizeVoucherRedemption(
  id: string,
  data: Record<string, unknown>,
): VoucherRedemption {
  return {
    id,
    voucherId: typeof data.voucherId === "string" ? data.voucherId : undefined,
    voucherCode:
      typeof data.voucherCode === "string" ? data.voucherCode : undefined,
    orderId: typeof data.orderId === "string" ? data.orderId : undefined,
    orderNumber:
      typeof data.orderNumber === "string" ? data.orderNumber : undefined,
    customerId:
      typeof data.customerId === "string" ? data.customerId : undefined,
    phone: typeof data.phone === "string" ? data.phone : undefined,
    channel:
      typeof data.channel === "string"
        ? (data.channel as VoucherUseChannel)
        : undefined,
    subtotal: typeof data.subtotal === "number" ? data.subtotal : 0,
    discountAmount:
      typeof data.discountAmount === "number" ? data.discountAmount : 0,
    totalAfterDiscount:
      typeof data.totalAfterDiscount === "number"
        ? data.totalAfterDiscount
        : 0,
    source:
      data.source === "checkout" || data.source === "pos"
        ? data.source
        : undefined,
    createdAt: toDate(data.createdAt as FirestoreDateValue),
  };
}

export async function getVoucherRedemptions(
  voucherId: string,
): Promise<VoucherRedemption[]> {
  const redemptionsRef = collection(db, VOUCHER_REDEMPTIONS_COLLECTION);
  const redemptionsQuery = query(
    redemptionsRef,
    where("voucherId", "==", voucherId),
  );
  const snapshot = await getDocs(redemptionsQuery);

  return snapshot.docs
    .map((redemptionDoc) =>
      normalizeVoucherRedemption(redemptionDoc.id, redemptionDoc.data()),
    )
    .sort(
      (left, right) =>
        (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0),
    );
}

export async function deleteMarketingCampaign(id: string): Promise<void> {
  await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, id));
}

export async function getMarketingSettings(): Promise<MarketingSettings> {
  try {
    const settingsDoc = await getDoc(
      doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID),
    );

    if (!settingsDoc.exists()) return defaultMarketingSettings;

    return normalizeSettings(settingsDoc.id, settingsDoc.data());
  } catch (error) {
    console.error("Error fetching marketing settings:", error);
    return defaultMarketingSettings;
  }
}

export async function updateMarketingSettings(
  data: MarketingSettingsInput,
): Promise<MarketingSettings> {
  const payload = {
    pointsPerAmount: Math.max(1, data.pointsPerAmount),
    birthdayVoucherEnabled: data.birthdayVoucherEnabled,
    birthdayVoucherTitle: data.birthdayVoucherTitle.trim(),
    birthdayVoucherDescription: data.birthdayVoucherDescription.trim(),
    tiers: data.tiers
      .map((tier) => ({
        ...tier,
        name: tier.name.trim(),
        benefit: tier.benefit.trim(),
        threshold: Math.max(0, tier.threshold),
      }))
      .sort((left, right) => left.threshold - right.threshold),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), payload, {
    merge: true,
  });

  return {
    id: SETTINGS_DOC_ID,
    ...payload,
    updatedAt: new Date(),
  };
}
