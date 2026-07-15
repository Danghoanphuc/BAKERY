"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Loader2,
  Plus,
  PencilLine,
  QrCode,
  ReceiptText,
  Search,
  TicketPercent,
  Trash2,
} from "lucide-react";
import type { MarketingCampaign } from "@/types";
import {
  audienceLabels,
  channelLabels,
  discountTypeLabels,
  formatCurrency,
  formatNumber,
  getVoucherMetrics,
} from "./_lib/voucher-admin";

type MarketingPayload = {
  campaigns: MarketingCampaign[];
};

const statusLabels: Record<MarketingCampaign["status"], string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  active: "Đang chạy",
  paused: "Tạm dừng",
  expired: "Kết thúc",
  completed: "Hoàn tất",
  archived: "Lưu trữ",
};

const statusClassNames: Record<MarketingCampaign["status"], string> = {
  draft: "bg-blue-50 text-blue-700",
  scheduled: "bg-violet-50 text-violet-700",
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  expired: "bg-neutral-100 text-neutral-600",
  completed: "bg-neutral-100 text-neutral-700",
  archived: "bg-neutral-100 text-neutral-500",
};

export default function AdminVoucherCampaignsPage() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteDraft(campaign: MarketingCampaign) {
    if (!window.confirm(`Xóa bản nháp “${campaign.name}”? Thao tác này không thể hoàn tác.`)) return;
    setDeletingId(campaign.id); setError(null);
    try {
      const response = await fetch(`/api/marketing/${campaign.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Không thể xóa campaign.");
      setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xóa campaign.");
    } finally { setDeletingId(null); }
  }

  useEffect(() => {
    async function loadCampaigns() {
      try {
        const response = await fetch("/api/marketing");
        if (!response.ok) throw new Error("load_failed");
        const payload = (await response.json()) as MarketingPayload;
        setCampaigns(
          payload.campaigns.filter((campaign) => campaign.type === "voucher"),
        );
      } catch (err) {
        console.error("Failed to load vouchers:", err);
        setError("Không thể tải danh sách voucher.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCampaigns();
  }, []);

  const filteredCampaigns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return campaigns;

    return campaigns.filter((campaign) => {
      return [campaign.name, campaign.code, campaign.customerDescription]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery));
    });
  }, [campaigns, query]);

  const totals = useMemo(() => {
    return campaigns.reduce(
      (summary, campaign) => {
        const metrics = getVoucherMetrics(campaign);
        summary.maxBudget += campaign.voucherBudget?.maxBudget ?? campaign.budget ?? 0;
        summary.discountSpent += metrics.discountSpent;
        summary.revenueGenerated += metrics.revenueGenerated;
        summary.active += campaign.status === "active" ? 1 : 0;
        return summary;
      },
      {
        maxBudget: 0,
        discountSpent: 0,
        revenueGenerated: 0,
        active: 0,
      },
    );
  }, [campaigns]);

  if (isLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải chương trình voucher...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">
            Chương trình voucher
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Quản trị voucher như một ngân sách khuyến mãi có giá trị, điều kiện,
            số lượng, đối tượng và kênh sử dụng rõ ràng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/pos/vouchers/scan"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <QrCode className="h-4 w-4" />
            Quét tại quầy
          </Link>
          <Link
            href="/admin/marketing/vouchers/new"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Tạo chương trình
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard
          icon={<TicketPercent className="h-5 w-5" />}
          label="Tổng chương trình"
          value={formatNumber(campaigns.length)}
        />
        <SummaryCard
          icon={<ReceiptText className="h-5 w-5" />}
          label="Đang chạy"
          value={formatNumber(totals.active)}
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Đã giảm"
          value={formatCurrency(totals.discountSpent)}
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Doanh thu tạo ra"
          value={formatCurrency(totals.revenueGenerated)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên chương trình hoặc mã voucher"
            className="h-10 w-full rounded-lg border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="text-sm font-semibold text-neutral-500">
          {formatNumber(filteredCampaigns.length)} chương trình
        </div>
      </div>

      <VoucherCampaignTable campaigns={filteredCampaigns} deletingId={deletingId} onDelete={deleteDraft} />
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
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function VoucherCampaignTable({
  campaigns,
  deletingId,
  onDelete,
}: {
  campaigns: MarketingCampaign[];
  deletingId: string | null;
  onDelete: (campaign: MarketingCampaign) => void;
}) {
  if (!campaigns.length) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-10 text-center">
        <TicketPercent className="mx-auto h-10 w-10 text-neutral-400" />
        <h2 className="mt-3 text-lg font-bold text-neutral-950">
          Chưa có chương trình voucher
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          Hãy tạo chương trình đầu tiên bằng wizard từng bước.
        </p>
        <Link
          href="/admin/marketing/vouchers/new"
          className="mt-5 inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white"
        >
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
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {campaigns.map((campaign) => {
              const metrics = getVoucherMetrics(campaign);
              const channels = campaign.channels ?? [];

              return (
                <tr key={campaign.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/marketing/vouchers/${campaign.id}`}
                      className="font-bold text-neutral-950 hover:text-brand-600"
                    >
                      {campaign.name}
                    </Link>
                    <p className="mt-1 max-w-[280px] truncate text-neutral-500">
                      {campaign.customerDescription || campaign.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {campaign.code && (
                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-700">
                          {campaign.code}
                        </span>
                      )}
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                        {discountTypeLabels[campaign.discountType]}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClassNames[campaign.status]}`}
                    >
                      {statusLabels[campaign.status]}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-neutral-900">
                    {formatNumber(metrics.issuedCount)} /{" "}
                    {metrics.issuedLimit
                      ? formatNumber(metrics.issuedLimit)
                      : "Không giới hạn"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-neutral-900">
                      {formatNumber(metrics.redeemedCount)}
                    </div>
                    <div className="text-xs text-neutral-500">
                      Tỷ lệ {metrics.usageRate}%
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-rose-600">
                    {formatCurrency(metrics.discountSpent)}
                  </td>
                  <td className="px-4 py-4 font-semibold text-emerald-700">
                    {formatCurrency(metrics.revenueGenerated)}
                  </td>
                  <td className="px-4 py-4 text-neutral-600">
                    {campaign.audienceType
                      ? audienceLabels[campaign.audienceType]
                      : campaign.audience}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {channels.length ? (
                        channels.map((channel) => (
                          <span
                            key={channel}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700"
                          >
                            {channelLabels[channel]}
                          </span>
                        ))
                      ) : (
                        <span className="text-neutral-500">
                          {campaign.channel}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2"><Link href={`/admin/marketing/vouchers/new?campaign=${campaign.id}`} className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-600 hover:border-brand-300 hover:text-brand-600" aria-label={`Sửa ${campaign.name}`}><PencilLine className="h-4 w-4" /></Link>{campaign.status === "draft" && metrics.issuedCount === 0 && metrics.discountSpent === 0 && <button disabled={deletingId === campaign.id} onClick={() => onDelete(campaign)} className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40" aria-label={`Xóa ${campaign.name}`}>{deletingId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
