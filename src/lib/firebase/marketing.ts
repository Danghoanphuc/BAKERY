import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type {
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingSettings,
  MarketingSettingsInput,
  TierSetting,
} from "@/types";
import { db } from "./config";

const CAMPAIGNS_COLLECTION = "marketing_campaigns";
const SETTINGS_COLLECTION = "marketing_settings";
const SETTINGS_DOC_ID = "loyalty";

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
    if (typeof value.seconds === "number") {
      return new Date(value.seconds * 1000);
    }
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

function normalizeCampaign(
  id: string,
  data: Record<string, unknown>,
): MarketingCampaign {
  return {
    id,
    name: String(data.name ?? ""),
    type:
      data.type === "voucher" || data.type === "loyalty"
        ? data.type
        : "campaign",
    status:
      data.status === "active" ||
      data.status === "paused" ||
      data.status === "expired"
        ? data.status
        : "draft",
    code: typeof data.code === "string" ? data.code : undefined,
    title: String(data.title ?? ""),
    description: String(data.description ?? ""),
    audience: String(data.audience ?? "Tất cả khách hàng"),
    channel: String(data.channel ?? "Ứng dụng"),
    startDate: toDate(data.startDate as FirestoreDateValue),
    endDate: toDate(data.endDate as FirestoreDateValue),
    budget: typeof data.budget === "number" ? data.budget : undefined,
    discountType:
      data.discountType === "amount" ||
      data.discountType === "free_shipping" ||
      data.discountType === "points_multiplier"
        ? data.discountType
        : "percent",
    discountValue:
      typeof data.discountValue === "number" ? data.discountValue : 0,
    minOrderValue:
      typeof data.minOrderValue === "number" ? data.minOrderValue : undefined,
    usageLimit:
      typeof data.usageLimit === "number" ? data.usageLimit : undefined,
    usedCount: typeof data.usedCount === "number" ? data.usedCount : 0,
    pointsMultiplier:
      typeof data.pointsMultiplier === "number"
        ? data.pointsMultiplier
        : undefined,
    isFeatured:
      typeof data.isFeatured === "boolean" ? data.isFeatured : false,
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
    title: data.title?.trim(),
    description: data.description?.trim(),
    audience: data.audience?.trim(),
    channel: data.channel?.trim(),
    startDate: cleanDate(data.startDate),
    endDate: cleanDate(data.endDate),
    budget: data.budget,
    discountType: data.discountType,
    discountValue: data.discountValue,
    minOrderValue: data.minOrderValue,
    usageLimit: data.usageLimit,
    usedCount: data.usedCount,
    pointsMultiplier: data.pointsMultiplier,
    isFeatured: data.isFeatured,
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
    usedCount: data.usedCount ?? 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const campaignRef = await addDoc(
    collection(db, CAMPAIGNS_COLLECTION),
    payload,
  );

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
