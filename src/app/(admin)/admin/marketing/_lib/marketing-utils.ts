import type { MarketingCampaign, MarketingCampaignInput } from "@/types";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function toDateInput(value?: Date | string) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export type CampaignForm = {
  name: string;
  type: MarketingCampaign["type"];
  status: MarketingCampaign["status"];
  code: string;
  title: string;
  description: string;
  audience: string;
  channel: string;
  startDate: string;
  endDate: string;
  budget: string;
  discountType: MarketingCampaign["discountType"];
  discountValue: string;
  minOrderValue: string;
  usageLimit: string;
  pointsMultiplier: string;
  isFeatured: boolean;
};

export const emptyCampaignForm: CampaignForm = {
  name: "",
  type: "voucher",
  status: "draft",
  code: "",
  title: "",
  description: "",
  audience: "Tất cả khách hàng",
  channel: "Ứng dụng",
  startDate: "",
  endDate: "",
  budget: "",
  discountType: "percent",
  discountValue: "10",
  minOrderValue: "",
  usageLimit: "",
  pointsMultiplier: "",
  isFeatured: false,
};

export function toCampaignForm(campaign: MarketingCampaign): CampaignForm {
  return {
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    code: campaign.code ?? "",
    title: campaign.title,
    description: campaign.description,
    audience: campaign.audience,
    channel: campaign.channel,
    startDate: toDateInput(campaign.startDate),
    endDate: toDateInput(campaign.endDate),
    budget: campaign.budget?.toString() ?? "",
    discountType: campaign.discountType,
    discountValue: campaign.discountValue.toString(),
    minOrderValue: campaign.minOrderValue?.toString() ?? "",
    usageLimit: campaign.usageLimit?.toString() ?? "",
    pointsMultiplier: campaign.pointsMultiplier?.toString() ?? "",
    isFeatured: campaign.isFeatured,
  };
}

export function buildCampaignPayload(
  form: CampaignForm,
): MarketingCampaignInput {
  return {
    name: form.name,
    type: form.type,
    status: form.status,
    code: form.code || undefined,
    title: form.title,
    description: form.description,
    audience: form.audience,
    channel: form.channel,
    startDate: form.startDate ? new Date(form.startDate) : undefined,
    endDate: form.endDate ? new Date(form.endDate) : undefined,
    budget: toNumber(form.budget),
    discountType: form.discountType,
    discountValue: toNumber(form.discountValue) ?? 0,
    minOrderValue: toNumber(form.minOrderValue),
    usageLimit: toNumber(form.usageLimit),
    usedCount: 0,
    pointsMultiplier: toNumber(form.pointsMultiplier),
    isFeatured: form.isFeatured,
  };
}
