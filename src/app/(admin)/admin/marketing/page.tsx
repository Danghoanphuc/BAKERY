"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Edit2,
  Gift,
  Loader2,
  Megaphone,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type {
  MarketingCampaign,
  MarketingCampaignInput,
  MarketingCampaignStatus,
  MarketingCampaignType,
  MarketingDiscountType,
  MarketingSettings,
} from "@/types";

type MarketingData = {
  campaigns: MarketingCampaign[];
  settings: MarketingSettings;
  summary: {
    totalCampaigns: number;
    activeCampaigns: number;
    voucherCampaigns: number;
    totalBudget: number;
    totalUsed: number;
  };
};

type CampaignForm = {
  name: string;
  type: MarketingCampaignType;
  status: MarketingCampaignStatus;
  code: string;
  title: string;
  description: string;
  audience: string;
  channel: string;
  startDate: string;
  endDate: string;
  budget: string;
  discountType: MarketingDiscountType;
  discountValue: string;
  minOrderValue: string;
  usageLimit: string;
  pointsMultiplier: string;
  isFeatured: boolean;
};

const emptyCampaignForm: CampaignForm = {
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

const statusLabels: Record<MarketingCampaignStatus, string> = {
  draft: "Nháp",
  active: "Đang chạy",
  paused: "Tạm dừng",
  expired: "Hết hạn",
};

const typeLabels: Record<MarketingCampaignType, string> = {
  campaign: "Chiến dịch",
  voucher: "Voucher",
  loyalty: "Tích điểm",
};

const discountLabels: Record<MarketingDiscountType, string> = {
  percent: "Giảm %",
  amount: "Giảm tiền",
  gift_item: "Tặng món",
  free_shipping: "Miễn ship",
  buy_x_get_y: "Mua X tặng Y",
  points_multiplier: "Nhân điểm",
};

function toDateInput(value?: Date | string) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function toCampaignForm(campaign: MarketingCampaign): CampaignForm {
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

function buildCampaignPayload(form: CampaignForm): MarketingCampaignInput {
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export default function MarketingPage() {
  const [data, setData] = useState<MarketingData | null>(null);
  const [activeTab, setActiveTab] = useState<"campaigns" | "vouchers" | "settings">(
    "campaigns",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<MarketingCampaign | null>(null);
  const [campaignForm, setCampaignForm] =
    useState<CampaignForm>(emptyCampaignForm);
  const [settingsForm, setSettingsForm] = useState<MarketingSettings | null>(
    null,
  );

  async function loadMarketing() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/marketing");
      if (!response.ok) throw new Error("load_failed");
      const payload = await response.json();
      setData(payload);
      setSettingsForm(payload.settings);
      setError(null);
    } catch (err) {
      console.error("Failed to load marketing:", err);
      setError("Không thể tải dữ liệu marketing.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMarketing();
  }, []);

  const visibleCampaigns = useMemo(() => {
    const campaigns = data?.campaigns ?? [];
    if (activeTab === "vouchers") {
      return campaigns.filter((campaign) => campaign.type === "voucher");
    }
    return campaigns;
  }, [activeTab, data?.campaigns]);

  function openCreate(type: MarketingCampaignType = "voucher") {
    setEditingCampaign(null);
    setCampaignForm({ ...emptyCampaignForm, type });
    setIsEditorOpen(true);
    setMessage(null);
    setError(null);
  }

  function openEdit(campaign: MarketingCampaign) {
    setEditingCampaign(campaign);
    setCampaignForm(toCampaignForm(campaign));
    setIsEditorOpen(true);
    setMessage(null);
    setError(null);
  }

  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = buildCampaignPayload(campaignForm);
      const response = await fetch(
        editingCampaign
          ? `/api/marketing/${editingCampaign.id}`
          : "/api/marketing",
        {
          method: editingCampaign ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw new Error("save_failed");

      setIsEditorOpen(false);
      setMessage(
        editingCampaign
          ? "Đã cập nhật chiến dịch."
          : "Đã tạo chiến dịch mới.",
      );
      await loadMarketing();
    } catch (err) {
      console.error("Failed to save campaign:", err);
      setError("Chưa lưu được chiến dịch. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateCampaignStatus(
    campaign: MarketingCampaign,
    status: MarketingCampaignStatus,
  ) {
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/marketing/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...campaign, status }),
      });

      if (!response.ok) throw new Error("status_failed");
      setMessage(`Đã chuyển "${campaign.name}" sang ${statusLabels[status]}.`);
      await loadMarketing();
    } catch (err) {
      console.error("Failed to update campaign status:", err);
      setError("Chưa cập nhật được trạng thái chiến dịch.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCampaign(campaign: MarketingCampaign) {
    if (!confirm(`Xóa chiến dịch "${campaign.name}"?`)) return;
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/marketing/${campaign.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("delete_failed");
      setMessage("Đã xóa chiến dịch.");
      await loadMarketing();
    } catch (err) {
      console.error("Failed to delete campaign:", err);
      setError("Chưa xóa được chiến dịch.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsForm) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/marketing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });

      if (!response.ok) throw new Error("settings_failed");
      setMessage("Đã cập nhật thông số tích điểm.");
      await loadMarketing();
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("Chưa lưu được thông số tích điểm.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="flex items-center gap-2 text-neutral-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải trung tâm marketing...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Khuyến mãi & Marketing
          </h1>
          <p className="mt-1 text-neutral-600">
            Quản lý chiến dịch, voucher, ưu đãi và thông số tích điểm.
          </p>
        </div>
        <button
          onClick={() => openCreate(activeTab === "settings" ? "loyalty" : "voucher")}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-white transition-colors hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Tạo chiến dịch
        </button>
      </div>

      {(message || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {error || message}
        </div>
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            icon={<Megaphone className="h-5 w-5" />}
            label="Tổng chiến dịch"
            value={formatNumber(data.summary.totalCampaigns)}
          />
          <SummaryCard
            icon={<PlayCircle className="h-5 w-5" />}
            label="Đang chạy"
            value={formatNumber(data.summary.activeCampaigns)}
          />
          <SummaryCard
            icon={<Gift className="h-5 w-5" />}
            label="Voucher"
            value={formatNumber(data.summary.voucherCampaigns)}
          />
          <SummaryCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Ngân sách"
            value={formatCurrency(data.summary.totalBudget)}
          />
        </div>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white p-1">
        <div className="grid gap-1 md:grid-cols-3">
          <TabButton
            active={activeTab === "campaigns"}
            icon={<Megaphone className="h-4 w-4" />}
            label="Chiến dịch"
            onClick={() => setActiveTab("campaigns")}
          />
          <TabButton
            active={activeTab === "vouchers"}
            icon={<Gift className="h-4 w-4" />}
            label="Voucher & ưu đãi"
            onClick={() => setActiveTab("vouchers")}
          />
          <TabButton
            active={activeTab === "settings"}
            icon={<SlidersHorizontal className="h-4 w-4" />}
            label="Thông số tích điểm"
            onClick={() => setActiveTab("settings")}
          />
        </div>
      </div>

      {activeTab === "settings" && settingsForm ? (
        <SettingsPanel
          settings={settingsForm}
          setSettings={setSettingsForm}
          onSubmit={saveSettings}
          isSaving={isSaving}
        />
      ) : (
        <CampaignTable
          campaigns={visibleCampaigns}
          onCreate={() => openCreate(activeTab === "vouchers" ? "voucher" : "campaign")}
          onEdit={openEdit}
          onDelete={deleteCampaign}
          onStatusChange={updateCampaignStatus}
          isSaving={isSaving}
        />
      )}

      {isEditorOpen && (
        <CampaignEditor
          form={campaignForm}
          setForm={setCampaignForm}
          editingCampaign={editingCampaign}
          onClose={() => setIsEditorOpen(false)}
          onSubmit={saveCampaign}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-brand-50 p-2 text-brand-600">{icon}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CampaignTable({
  campaigns,
  onCreate,
  onEdit,
  onDelete,
  onStatusChange,
  isSaving,
}: {
  campaigns: MarketingCampaign[];
  onCreate: () => void;
  onEdit: (campaign: MarketingCampaign) => void;
  onDelete: (campaign: MarketingCampaign) => void;
  onStatusChange: (
    campaign: MarketingCampaign,
    status: MarketingCampaignStatus,
  ) => void;
  isSaving: boolean;
}) {
  if (!campaigns.length) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
          <Megaphone className="h-8 w-8 text-brand-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-neutral-900">
          Chưa có chiến dịch
        </h3>
        <p className="mb-6 text-neutral-600">
          Tạo voucher, ưu đãi hoặc chiến dịch tích điểm đầu tiên.
        </p>
        <button
          onClick={onCreate}
          className="rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Tạo chiến dịch
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Chiến dịch</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Ưu đãi</th>
              <th className="px-4 py-3">Thời gian</th>
              <th className="px-4 py-3">Sử dụng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-neutral-50">
                <td className="px-4 py-4">
                  <div className="font-semibold text-neutral-900">
                    {campaign.name}
                  </div>
                  <div className="mt-1 max-w-[280px] truncate text-neutral-500">
                    {campaign.title}
                  </div>
                  {campaign.code && (
                    <div className="mt-2 inline-flex rounded bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-700">
                      {campaign.code}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4">{typeLabels[campaign.type]}</td>
                <td className="px-4 py-4">
                  <div className="font-medium">
                    {discountLabels[campaign.discountType]}
                  </div>
                  <div className="text-neutral-500">
                    {campaign.discountType === "amount"
                      ? formatCurrency(campaign.discountValue)
                      : campaign.discountType === "free_shipping"
                        ? "Miễn phí giao hàng"
                        : campaign.discountType === "points_multiplier"
                          ? `x${campaign.pointsMultiplier ?? campaign.discountValue}`
                          : `${campaign.discountValue}%`}
                  </div>
                </td>
                <td className="px-4 py-4 text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4" />
                    {toDateInput(campaign.startDate) || "Chưa đặt"}
                  </div>
                  <div className="mt-1 text-xs">
                    đến {toDateInput(campaign.endDate) || "không giới hạn"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {formatNumber(campaign.usedCount)}
                  {campaign.usageLimit ? ` / ${formatNumber(campaign.usageLimit)}` : ""}
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      campaign.status === "active"
                        ? "bg-green-100 text-green-700"
                        : campaign.status === "paused"
                          ? "bg-amber-100 text-amber-700"
                          : campaign.status === "expired"
                            ? "bg-neutral-200 text-neutral-600"
                            : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {statusLabels[campaign.status]}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() =>
                        onStatusChange(
                          campaign,
                          campaign.status === "active" ? "paused" : "active",
                        )
                      }
                      disabled={isSaving}
                      className="rounded-md border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                      aria-label="Đổi trạng thái"
                    >
                      {campaign.status === "active" ? (
                        <PauseCircle className="h-4 w-4" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => onEdit(campaign)}
                      className="rounded-md border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-100"
                      aria-label="Sửa"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(campaign)}
                      disabled={isSaving}
                      className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                      aria-label="Xóa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CampaignEditor({
  form,
  setForm,
  editingCampaign,
  onClose,
  onSubmit,
  isSaving,
}: {
  form: CampaignForm;
  setForm: (form: CampaignForm) => void;
  editingCampaign: MarketingCampaign | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {editingCampaign ? "Sửa chiến dịch" : "Tạo chiến dịch"}
            </h2>
            <p className="text-sm text-neutral-500">
              Nội dung này có thể hiển thị trong kho voucher của khách hàng.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field
            label="Tên nội bộ"
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
            required
          />
          <Field
            label="Tiêu đề khách thấy"
            value={form.title}
            onChange={(value) => setForm({ ...form, title: value })}
            required
          />
          <SelectField
            label="Loại"
            value={form.type}
            onChange={(value) =>
              setForm({ ...form, type: value as MarketingCampaignType })
            }
            options={[
              ["campaign", "Chiến dịch"],
              ["voucher", "Voucher"],
              ["loyalty", "Tích điểm"],
            ]}
          />
          <SelectField
            label="Trạng thái"
            value={form.status}
            onChange={(value) =>
              setForm({ ...form, status: value as MarketingCampaignStatus })
            }
            options={[
              ["draft", "Nháp"],
              ["active", "Đang chạy"],
              ["paused", "Tạm dừng"],
              ["expired", "Hết hạn"],
            ]}
          />
          <TextArea
            label="Mô tả"
            value={form.description}
            onChange={(value) => setForm({ ...form, description: value })}
          />
          <div className="space-y-4">
            <Field
              label="Mã voucher"
              value={form.code}
              onChange={(value) => setForm({ ...form, code: value })}
              placeholder="VD: SWEET20"
            />
            <Field
              label="Đối tượng"
              value={form.audience}
              onChange={(value) => setForm({ ...form, audience: value })}
            />
            <Field
              label="Kênh"
              value={form.channel}
              onChange={(value) => setForm({ ...form, channel: value })}
            />
          </div>
          <SelectField
            label="Kiểu ưu đãi"
            value={form.discountType}
            onChange={(value) =>
              setForm({
                ...form,
                discountType: value as MarketingDiscountType,
              })
            }
            options={[
              ["percent", "Giảm %"],
              ["amount", "Giảm tiền"],
              ["free_shipping", "Miễn ship"],
              ["points_multiplier", "Nhân điểm"],
            ]}
          />
          <Field
            label="Giá trị ưu đãi"
            type="number"
            value={form.discountValue}
            onChange={(value) => setForm({ ...form, discountValue: value })}
          />
          <Field
            label="Đơn tối thiểu"
            type="number"
            value={form.minOrderValue}
            onChange={(value) => setForm({ ...form, minOrderValue: value })}
          />
          <Field
            label="Giới hạn lượt dùng"
            type="number"
            value={form.usageLimit}
            onChange={(value) => setForm({ ...form, usageLimit: value })}
          />
          <Field
            label="Hệ số nhân điểm"
            type="number"
            value={form.pointsMultiplier}
            onChange={(value) => setForm({ ...form, pointsMultiplier: value })}
          />
          <Field
            label="Ngân sách"
            type="number"
            value={form.budget}
            onChange={(value) => setForm({ ...form, budget: value })}
          />
          <Field
            label="Ngày bắt đầu"
            type="date"
            value={form.startDate}
            onChange={(value) => setForm({ ...form, startDate: value })}
          />
          <Field
            label="Ngày kết thúc"
            type="date"
            value={form.endDate}
            onChange={(value) => setForm({ ...form, endDate: value })}
          />
          <label className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(event) =>
                setForm({ ...form, isFeatured: event.target.checked })
              }
              className="h-4 w-4"
            />
            <span className="text-sm font-medium text-neutral-700">
              Đánh dấu là ưu đãi nổi bật
            </span>
          </label>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-neutral-200 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Lưu chiến dịch
          </button>
        </div>
      </form>
    </div>
  );
}

function SettingsPanel({
  settings,
  setSettings,
  onSubmit,
  isSaving,
}: {
  settings: MarketingSettings;
  setSettings: (settings: MarketingSettings) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-lg border border-neutral-200 bg-white p-5"
    >
      <div>
        <h2 className="text-lg font-bold text-neutral-900">
          Thông số tích điểm
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Các thay đổi ở đây sẽ ảnh hưởng tới trang hồ sơ và trang rewards của khách.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Số tiền đổi 1 điểm"
          type="number"
          value={settings.pointsPerAmount.toString()}
          onChange={(value) =>
            setSettings({
              ...settings,
              pointsPerAmount: toNumber(value) ?? 1,
            })
          }
        />
        <Field
          label="Tiêu đề voucher sinh nhật"
          value={settings.birthdayVoucherTitle}
          onChange={(value) =>
            setSettings({ ...settings, birthdayVoucherTitle: value })
          }
        />
        <label className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3">
          <input
            type="checkbox"
            checked={settings.birthdayVoucherEnabled}
            onChange={(event) =>
              setSettings({
                ...settings,
                birthdayVoucherEnabled: event.target.checked,
              })
            }
            className="h-4 w-4"
          />
          <span className="text-sm font-medium text-neutral-700">
            Bật voucher sinh nhật
          </span>
        </label>
      </div>
      <TextArea
        label="Mô tả voucher sinh nhật"
        value={settings.birthdayVoucherDescription}
        onChange={(value) =>
          setSettings({ ...settings, birthdayVoucherDescription: value })
        }
      />

      <div className="space-y-3">
        <h3 className="font-bold text-neutral-900">Hạng thành viên</h3>
        <div className="grid gap-3">
          {settings.tiers.map((tier, index) => (
            <div
              key={tier.id}
              className="grid gap-3 rounded-lg border border-neutral-200 p-3 md:grid-cols-[80px_1fr_120px_1fr]"
            >
              <Field
                label="Icon"
                value={tier.icon}
                onChange={(value) => {
                  const tiers = [...settings.tiers];
                  tiers[index] = { ...tier, icon: value };
                  setSettings({ ...settings, tiers });
                }}
              />
              <Field
                label="Tên hạng"
                value={tier.name}
                onChange={(value) => {
                  const tiers = [...settings.tiers];
                  tiers[index] = { ...tier, name: value };
                  setSettings({ ...settings, tiers });
                }}
              />
              <Field
                label="Mốc điểm"
                type="number"
                value={tier.threshold.toString()}
                onChange={(value) => {
                  const tiers = [...settings.tiers];
                  tiers[index] = {
                    ...tier,
                    threshold: toNumber(value) ?? 0,
                  };
                  setSettings({ ...settings, tiers });
                }}
              />
              <Field
                label="Quyền lợi"
                value={tier.benefit}
                onChange={(value) => {
                  const tiers = [...settings.tiers];
                  tiers[index] = { ...tier, benefit: value };
                  setSettings({ ...settings, tiers });
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Lưu thông số
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
      >
        {options.map(([optionValue, labelText]) => (
          <option key={optionValue} value={optionValue}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
    </label>
  );
}
