"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Loader2,
  Palette,
  Plus,
  ReceiptText,
  Save,
  SlidersHorizontal,
  TicketPercent,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { MarketingCampaign, MarketingSettings } from "@/types";
import { audienceLabels, channelLabels, discountTypeLabels, formatCurrency, formatNumber, getVoucherMetrics } from "../vouchers/_lib/voucher-admin";

type MarketingPayload = {
  campaigns: MarketingCampaign[];
  settings: MarketingSettings;
};

const statusLabels: Record<MarketingCampaign["status"], string> = {
  draft: "Nháp", scheduled: "Đã lên lịch", active: "Đang chạy", paused: "Tạm dừng",
  expired: "Kết thúc", completed: "Hoàn tất", archived: "Lưu trữ",
};
const statusClassNames: Record<MarketingCampaign["status"], string> = {
  draft: "bg-blue-50 text-blue-700", scheduled: "bg-violet-50 text-violet-700",
  active: "bg-emerald-50 text-emerald-700", paused: "bg-amber-50 text-amber-700",
  expired: "bg-neutral-100 text-neutral-600", completed: "bg-neutral-100 text-neutral-700",
  archived: "bg-neutral-100 text-neutral-500",
};

function toNumber(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<MarketingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  async function loadMarketing() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/marketing");
      if (!response.ok) throw new Error("load_failed");
      const payload = (await response.json()) as MarketingPayload;
      setCampaigns(payload.campaigns.filter((campaign) => campaign.type === "voucher"));
      setSettings(payload.settings);
      setSettingsDraft(payload.settings);
    } catch (err) {
      console.error("Failed to load marketing:", err);
      toast.error("Không thể tải dữ liệu marketing.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMarketing();
  }, []);

  const totals = useMemo(() => {
    return campaigns.reduce(
      (summary, campaign) => {
        const metrics = getVoucherMetrics(campaign);
        summary.active += campaign.status === "active" ? 1 : 0;
        summary.revenueGenerated += metrics.revenueGenerated;
        summary.issuedCount += metrics.issuedCount;
        summary.redeemedCount += metrics.redeemedCount;
        return summary;
      },
      { active: 0, revenueGenerated: 0, issuedCount: 0, redeemedCount: 0 },
    );
  }, [campaigns]);

  const redemptionRate =
    totals.issuedCount > 0
      ? Math.round((totals.redeemedCount / totals.issuedCount) * 1000) / 10
      : 0;

  function openSettings() {
    setSettingsDraft(settings);
    setIsSettingsOpen(true);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settingsDraft) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/marketing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsDraft),
      });

      if (!response.ok) throw new Error("settings_failed");
      setSettings(settingsDraft);
      setIsSettingsOpen(false);
      toast.success("Đã cập nhật cấu hình điểm.");
      await loadMarketing();
    } catch (err) {
      console.error("Failed to save reward settings:", err);
      toast.error("Chưa lưu được cấu hình điểm.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải trung tâm marketing...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">Marketing</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Quản lý voucher, ưu đãi và cấu hình điểm thưởng trong một màn hình.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openSettings}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Cấu hình điểm
          </button>
          <Link
            href="/admin/marketing/vouchers/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Tạo chương trình
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard icon={<TicketPercent className="h-5 w-5" />} label="Chương trình" value={formatNumber(campaigns.length)} />
        <SummaryCard icon={<ReceiptText className="h-5 w-5" />} label="Đang chạy" value={formatNumber(totals.active)} />
        <SummaryCard icon={<BarChart3 className="h-5 w-5" />} label="Tỷ lệ dùng" value={`${redemptionRate}%`} />
        <SummaryCard icon={<BarChart3 className="h-5 w-5" />} label="Doanh thu tạo ra" value={formatCurrency(totals.revenueGenerated)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/marketing/vouchers" className="group rounded-2xl border border-[#f0d8b8] bg-[#fffaf0] p-6 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#ffc845] text-[#74351f]"><TicketPercent className="h-6 w-6" /></span><span className="text-sm font-black text-brand-600">Mở workspace →</span></div><h2 className="mt-5 text-xl font-black text-[#3d2417]">Voucher</h2><p className="mt-2 text-sm leading-6 text-[#7b6254]">Tạo bằng AI, quản lý phát hành, lượt dùng, ngân sách, phiên bản và audit tại một nơi duy nhất.</p><div className="mt-5 flex gap-5 text-sm"><span><b className="block text-lg text-[#3d2417]">{formatNumber(campaigns.length)}</b> chương trình</span><span><b className="block text-lg text-emerald-700">{formatNumber(totals.active)}</b> đang chạy</span></div></Link>
        <Link href="/admin/marketing/loyalty" className="group rounded-2xl border border-neutral-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600"><SlidersHorizontal className="h-6 w-6" /></span><span className="text-sm font-black text-brand-600">Mở workspace →</span></div><h2 className="mt-5 text-xl font-black text-neutral-950">Loyalty Operating System</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Vận hành điểm, hạng thành viên, luật thưởng, kho phần thưởng, phân khúc và mô phỏng.</p><p className="mt-5 text-sm font-bold text-neutral-700">{settings?.pointsPerAmount ? `${formatCurrency(settings.pointsPerAmount)} = 1 điểm` : "Chưa cấu hình"}</p></Link>
        <Link href="/admin/marketing/brand" className="group rounded-2xl border border-[#cde5e1] bg-[#f6fbfa] p-6 text-left transition hover:-translate-y-0.5 hover:border-[#2f8d88]/60 hover:shadow-lg"><div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#e3f1ee] text-[#2f8d88]"><Palette className="h-6 w-6" /></span><span className="text-sm font-black text-[#2f8d88]">Xem hướng dẫn →</span></div><h2 className="mt-5 text-xl font-black text-[#123e66]">Thương hiệu SweetTime</h2><p className="mt-2 text-sm leading-6 text-[#647078]">Tra cứu màu sắc, typography, logo, giọng điệu và nguyên tắc ứng dụng nhất quán.</p><p className="mt-5 text-sm font-bold text-[#123e66]">Warm · Joyful · Refined</p></Link>
      </div>

      {isSettingsOpen && settingsDraft && (
        <SettingsModal
          settings={settingsDraft}
          setSettings={setSettingsDraft}
          onClose={() => setIsSettingsOpen(false)}
          onSubmit={saveSettings}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>
      <p className="mt-3 text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-950">{value}</p>
    </div>
  );
}

export function VoucherCampaignTable({ campaigns }: { campaigns: MarketingCampaign[] }) {
  if (!campaigns.length) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center">
        <TicketPercent className="mx-auto h-10 w-10 text-neutral-400" />
        <h2 className="mt-3 text-lg font-bold text-neutral-950">Chưa có chương trình voucher</h2>
        <p className="mt-1 text-sm text-neutral-600">Hãy tạo chương trình đầu tiên bằng wizard từng bước.</p>
        <Link href="/admin/marketing/vouchers/new" className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white">
          Tạo chương trình
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Tên chương trình</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Đã phát hành</th>
              <th className="px-4 py-3">Đã dùng</th>
              <th className="px-4 py-3">Tiền đã giảm</th>
              <th className="px-4 py-3">Doanh thu tạo ra</th>
              <th className="px-4 py-3">Đối tượng</th>
              <th className="px-4 py-3">Kênh dùng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {campaigns.map((campaign) => {
              const metrics = getVoucherMetrics(campaign);
              const channels = campaign.channels ?? [];

              return (
                <tr key={campaign.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-4">
                    <Link href={`/admin/marketing/vouchers/${campaign.id}`} className="font-bold text-neutral-950 hover:text-brand-600">
                      {campaign.name}
                    </Link>
                    <p className="mt-1 max-w-[280px] truncate text-neutral-500">
                      {campaign.customerDescription || campaign.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {campaign.code && (
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-700">{campaign.code}</span>
                      )}
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                        {discountTypeLabels[campaign.discountType]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClassNames[campaign.status]}`}>
                      {statusLabels[campaign.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-neutral-900">
                    {formatNumber(metrics.issuedCount)} / {metrics.issuedLimit ? formatNumber(metrics.issuedLimit) : "Không giới hạn"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-900">{formatNumber(metrics.redeemedCount)}</div>
                    <div className="text-xs text-neutral-500">Tỷ lệ {metrics.usageRate}%</div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-rose-600">{formatCurrency(metrics.discountSpent)}</td>
                  <td className="px-4 py-4 font-semibold text-emerald-700">{formatCurrency(metrics.revenueGenerated)}</td>
                  <td className="px-4 py-4 text-neutral-600">
                    {campaign.audienceType ? audienceLabels[campaign.audienceType] : campaign.audience}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {channels.length ? (
                        channels.map((channel) => (
                          <span key={channel} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                            {channelLabels[channel]}
                          </span>
                        ))
                      ) : (
                        <span className="text-neutral-500">{campaign.channel}</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsModal({
  settings,
  setSettings,
  onClose,
  onSubmit,
  isSaving,
}: {
  settings: MarketingSettings;
  setSettings: (settings: MarketingSettings) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Cấu hình điểm</h2>
            <p className="text-sm text-neutral-500">Thiết lập cách tích điểm, voucher sinh nhật và hạng thành viên.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <LabeledField
              label="Số tiền đổi 1 điểm"
              type="number"
              value={settings.pointsPerAmount.toString()}
              onChange={(value) => setSettings({ ...settings, pointsPerAmount: toNumber(value) ?? 1 })}
            />
            <LabeledField
              label="Tiêu đề voucher sinh nhật"
              value={settings.birthdayVoucherTitle}
              onChange={(value) => setSettings({ ...settings, birthdayVoucherTitle: value })}
            />
            <label className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-3">
              <input
                type="checkbox"
                checked={settings.birthdayVoucherEnabled}
                onChange={(event) => setSettings({ ...settings, birthdayVoucherEnabled: event.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-neutral-700">Bật voucher sinh nhật</span>
            </label>
          </div>

          <TextArea
            label="Mô tả voucher sinh nhật"
            value={settings.birthdayVoucherDescription}
            onChange={(value) => setSettings({ ...settings, birthdayVoucherDescription: value })}
          />

          <div className="overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Icon</th>
                  <th className="px-4 py-3">Tên hạng</th>
                  <th className="px-4 py-3">Mốc điểm</th>
                  <th className="px-4 py-3">Quyền lợi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {settings.tiers.map((tier, index) => (
                  <tr key={tier.id}>
                    <td className="px-4 py-3">
                      <Field value={tier.icon} onChange={(value) => {
                        const tiers = [...settings.tiers];
                        tiers[index] = { ...tier, icon: value };
                        setSettings({ ...settings, tiers });
                      }} />
                    </td>
                    <td className="px-4 py-3">
                      <Field value={tier.name} onChange={(value) => {
                        const tiers = [...settings.tiers];
                        tiers[index] = { ...tier, name: value };
                        setSettings({ ...settings, tiers });
                      }} />
                    </td>
                    <td className="px-4 py-3">
                      <Field type="number" value={tier.threshold.toString()} onChange={(value) => {
                        const tiers = [...settings.tiers];
                        tiers[index] = { ...tier, threshold: toNumber(value) ?? 0 };
                        setSettings({ ...settings, tiers });
                      }} />
                    </td>
                    <td className="px-4 py-3">
                      <Field value={tier.benefit} onChange={(value) => {
                        const tiers = [...settings.tiers];
                        tiers[index] = { ...tier, benefit: value };
                        setSettings({ ...settings, tiers });
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-neutral-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
            Hủy
          </button>
          <button type="submit" disabled={isSaving} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu cấu hình
          </button>
        </div>
      </form>
    </div>
  );
}

function LabeledField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <Field type={type} value={value} onChange={onChange} />
    </label>
  );
}

function Field({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
    />
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
    <label className="block">
      <span className="text-xs font-bold text-neutral-600">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
      />
    </label>
  );
}
