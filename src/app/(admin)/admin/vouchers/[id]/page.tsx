"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Archive, Loader2, Pause, PencilLine, Play, Square } from "lucide-react";
import { toast } from "sonner";
import type { MarketingCampaign } from "@/types";
import {
  audienceLabels,
  channelLabels,
  discountTypeLabels,
  formatCurrency,
  formatNumber,
  getVoucherMetrics,
} from "../_lib/voucher-admin";

type TabId = "overview" | "rules" | "issued" | "redemptions" | "versions" | "audit";

type VoucherIssueRow = { id: string; customerId?: string; phone?: string; issueMethod: string; status: string; actor?: string; issuedAt?: string; expiresAt?: string };
type VoucherAuditRow = { id: string; action: string; actor: string; reason?: string; changedFields: string[]; createdAt?: string };
type VoucherVersionRow = { id: string; version: number; actor: string; reason?: string; createdAt?: string };

type VoucherRedemptionRow = {
  id: string;
  voucherId?: string;
  voucherCode?: string;
  orderId?: string;
  orderNumber?: string;
  customerId?: string;
  phone?: string;
  channel?: string;
  subtotal: number;
  discountAmount: number;
  totalAfterDiscount: number;
  source?: "checkout" | "pos";
  createdAt?: string;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "rules", label: "Điều kiện" },
  { id: "issued", label: "Khách đã nhận" },
  { id: "redemptions", label: "Lượt sử dụng" },
  { id: "versions", label: "Phiên bản" },
  { id: "audit", label: "Nhật ký chỉnh sửa" },
];

export default function VoucherCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [redemptions, setRedemptions] = useState<VoucherRedemptionRow[]>([]);
  const [issues, setIssues] = useState<VoucherIssueRow[]>([]);
  const [auditLog, setAuditLog] = useState<VoucherAuditRow[]>([]);
  const [versions, setVersions] = useState<VoucherVersionRow[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    async function loadCampaign() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/marketing");
        if (!response.ok) throw new Error("load_failed");
        const payload = await response.json();
        const nextCampaign = (payload.campaigns as MarketingCampaign[]).find(
          (item) => item.id === id,
        );
        if (!nextCampaign) throw new Error("not_found");

        const redemptionsResponse = await fetch(
          `/api/vouchers/${id}/redemptions`,
        );
        const redemptionsPayload = redemptionsResponse.ok
          ? await redemptionsResponse.json()
          : { redemptions: [] };
        const lifecycleResponse = await fetch(`/api/admin/vouchers/${id}/lifecycle`, { cache: "no-store" });
        const lifecyclePayload = lifecycleResponse.ok ? await lifecycleResponse.json() : { issues: [], versions: [], auditLog: [] };

        setCampaign(nextCampaign);
        setRedemptions(redemptionsPayload.redemptions ?? []);
        setIssues(lifecyclePayload.issues ?? []);
        setVersions(lifecyclePayload.versions ?? []);
        setAuditLog(lifecyclePayload.auditLog ?? []);
        setError(null);
      } catch (err) {
        console.error("Failed to load voucher detail:", err);
        setError("Không tìm thấy chương trình voucher.");
      } finally {
        setIsLoading(false);
      }
    }

    loadCampaign();
  }, [id]);

  const metrics = useMemo(
    () => (campaign ? getVoucherMetrics(campaign) : null),
    [campaign],
  );

  async function changeStatus(status: MarketingCampaign["status"], action: string) {
    if (!campaign || isMutating) return;
    setIsMutating(true); setError(null);
    try {
      const response = await fetch(`/api/marketing/${campaign.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, auditAction: action, changeReason: `Chuyển trạng thái sang ${status}` }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Không thể đổi trạng thái.");
      setCampaign((current) => current ? { ...current, status } : current);
      const lifecycle = await fetch(`/api/admin/vouchers/${campaign.id}/lifecycle`, { cache: "no-store" }).then((item) => item.json());
      setAuditLog(lifecycle.auditLog ?? []); setVersions(lifecycle.versions ?? []);
      toast.success("Đã cập nhật trạng thái voucher.");
    } catch (reason) { toast.error(reason instanceof Error ? reason.message : "Không thể đổi trạng thái."); }
    finally { setIsMutating(false); }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải chi tiết voucher...
        </div>
      </div>
    );
  }

  if (error || !campaign || !metrics) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
        {error || "Không tìm thấy chương trình voucher."}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/marketing/vouchers"
          className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách voucher
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-950">
              {campaign.name}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-neutral-600">
              {campaign.customerDescription || campaign.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2"><Link href={`/admin/marketing/vouchers/new?campaign=${campaign.id}`} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700"><PencilLine className="h-4 w-4" /> Tạo phiên bản mới</Link>{campaign.status === "active" && <button disabled={isMutating} onClick={() => changeStatus("paused", "campaign_paused")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-100 px-3 text-sm font-bold text-amber-800"><Pause className="h-4 w-4" /> Tạm dừng</button>}{campaign.status === "paused" && <button disabled={isMutating} onClick={() => changeStatus("active", "campaign_resumed")} className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-100 px-3 text-sm font-bold text-emerald-800"><Play className="h-4 w-4" /> Tiếp tục</button>}{["active", "paused"].includes(campaign.status) && <button disabled={isMutating} onClick={() => changeStatus("completed", "campaign_completed")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700"><Square className="h-4 w-4" /> Kết thúc</button>}{["completed", "expired"].includes(campaign.status) && <button disabled={isMutating} onClick={() => changeStatus("archived", "campaign_archived")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700"><Archive className="h-4 w-4" /> Lưu trữ</button>}{campaign.code && (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm">
              <span className="text-neutral-500">Mã voucher</span>
              <div className="mt-1 text-lg font-black text-neutral-950">
                {campaign.code}
              </div>
            </div>
          )}</div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-1">
        <div className="grid gap-1 md:grid-cols-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-2 text-sm font-semibold ${
                activeTab === tab.id
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && (
        <OverviewTab campaign={campaign} metrics={metrics} />
      )}
      {activeTab === "rules" && <RulesTab campaign={campaign} />}
      {activeTab === "issued" && (
        <IssuedCustomersTab issues={issues} />
      )}
      {activeTab === "redemptions" && (
        <RedemptionsTab redemptions={redemptions} />
      )}
      {activeTab === "versions" && <VersionsTab versions={versions} activeVersionId={campaign.activeVersionId} />}
      {activeTab === "audit" && (
        <AuditTab entries={auditLog} />
      )}
    </div>
  );
}

function OverviewTab({
  campaign,
  metrics,
}: {
  campaign: MarketingCampaign;
  metrics: ReturnType<typeof getVoucherMetrics>;
}) {
  const maxBudget = campaign.voucherBudget?.maxBudget ?? campaign.budget ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Ngân sách tối đa" value={formatCurrency(maxBudget)} />
      <Metric label="Đã giảm" value={formatCurrency(metrics.discountSpent)} />
      <Metric
        label="Còn lại"
        value={formatCurrency(Math.max(0, maxBudget - metrics.discountSpent))}
      />
      <Metric
        label="Đã phát hành"
        value={`${formatNumber(metrics.issuedCount)} / ${
          metrics.issuedLimit
            ? formatNumber(metrics.issuedLimit)
            : "Không giới hạn"
        }`}
      />
      <Metric label="Đã sử dụng" value={formatNumber(metrics.redeemedCount)} />
      <Metric label="Tỷ lệ dùng" value={`${metrics.usageRate}%`} />
      <Metric
        label="Doanh thu từ đơn dùng voucher"
        value={formatCurrency(metrics.revenueGenerated)}
      />
      <Metric
        label="Giá trị đơn trung bình"
        value={formatCurrency(
          metrics.redeemedCount
            ? Math.round(metrics.revenueGenerated / metrics.redeemedCount)
            : 0,
        )}
      />
      <Metric
        label="Loại ưu đãi"
        value={discountTypeLabels[campaign.discountType]}
      />
    </div>
  );
}

function RulesTab({ campaign }: { campaign: MarketingCampaign }) {
  const rules = campaign.rules;
  const channels = campaign.channels ?? [];

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <InfoLine
          label="Giá trị"
          value={`${discountTypeLabels[campaign.discountType]} ${
            campaign.discountValue
          }${campaign.discountType === "percent" ? "%" : "đ"}`}
        />
        <InfoLine
          label="Giảm tối đa"
          value={formatCurrency(
            campaign.maxDiscountAmount ?? rules?.maxDiscountAmount ?? 0,
          )}
        />
        <InfoLine
          label="Đơn tối thiểu"
          value={formatCurrency(
            campaign.minOrderValue ?? rules?.minOrderValue ?? 0,
          )}
        />
        <InfoLine
          label="Mỗi khách dùng"
          value={`${rules?.maxUsesPerCustomer ?? 1} lần`}
        />
        <InfoLine
          label="Thời hạn"
          value={`${rules?.validDaysAfterIssue ?? 0} ngày sau khi nhận`}
        />
        <InfoLine
          label="Dùng chung voucher khác"
          value={rules?.stackable ? "Có" : "Không"}
        />
        <InfoLine
          label="Đối tượng"
          value={
            campaign.audienceType
              ? audienceLabels[campaign.audienceType]
              : campaign.audience
          }
        />
        <InfoLine
          label="Kênh dùng"
          value={
            channels.length
              ? channels.map((channel) => channelLabels[channel]).join(", ")
              : campaign.channel
          }
        />
      </div>
    </section>
  );
}

function IssuedCustomersTab({
  issues,
}: {
  issues: VoucherIssueRow[];
}) {
  return (
    <DataTable
      title="Khách đã nhận"
      columns={[
        "Khách",
        "Số điện thoại",
        "Ngày nhận",
        "Trạng thái",
        "Kênh",
      ]}
      emptyText="Chưa có khách nào nhận hoặc dùng voucher này."
    >
      {issues.map((row) => (
        <tr key={row.id} className="border-t border-neutral-100">
          <td className="px-3 py-3 font-semibold text-neutral-950">
            {row.customerId ? `KH ${row.customerId.slice(0, 6)}` : "-"}
          </td>
          <td className="px-3 py-3">{row.phone || "-"}</td>
          <td className="px-3 py-3">{formatDateTime(row.issuedAt)}</td>
          <td className="px-3 py-3">
            <span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === "redeemed" ? "bg-emerald-50 text-emerald-700" : row.status === "available" ? "bg-blue-50 text-blue-700" : "bg-neutral-100 text-neutral-600"}`}>
              {row.status === "redeemed" ? "Đã dùng" : row.status === "available" ? "Chưa dùng" : row.status}
            </span>
          </td>
          <td className="px-3 py-3">{formatIssueMethod(row.issueMethod)}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function VersionsTab({ versions, activeVersionId }: { versions: VoucherVersionRow[]; activeVersionId?: string }) {
  return <DataTable title="Lịch sử phiên bản" columns={["Phiên bản", "Trạng thái", "Người tạo", "Thời gian", "Lý do"]} emptyText="Campaign cũ chưa có phiên bản. Phiên bản đầu tiên sẽ được tạo ở lần cập nhật tiếp theo.">{versions.map((row) => <tr key={row.id} className="border-t border-neutral-100"><td className="px-3 py-3 font-black text-neutral-950">v{row.version}</td><td className="px-3 py-3">{row.id === activeVersionId ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Đang áp dụng</span> : "Lịch sử"}</td><td className="px-3 py-3">{row.actor}</td><td className="px-3 py-3">{formatDateTime(row.createdAt)}</td><td className="px-3 py-3">{row.reason || "-"}</td></tr>)}</DataTable>;
}

function AuditTab({ entries }: { entries: VoucherAuditRow[] }) {
  return <DataTable title="Nhật ký vòng đời" columns={["Thời gian", "Người thực hiện", "Hành động", "Trường thay đổi", "Lý do"]} emptyText="Campaign cũ chưa có audit log. Các thay đổi tiếp theo sẽ được ghi tự động.">{entries.map((row) => <tr key={row.id} className="border-t border-neutral-100"><td className="px-3 py-3">{formatDateTime(row.createdAt)}</td><td className="px-3 py-3 font-semibold text-neutral-950">{row.actor}</td><td className="px-3 py-3"><span className="rounded bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-700">{auditActionLabel(row.action)}</span></td><td className="max-w-xs px-3 py-3 text-neutral-600">{row.changedFields.join(", ") || "-"}</td><td className="px-3 py-3">{row.reason || "-"}</td></tr>)}</DataTable>;
}

function RedemptionsTab({
  redemptions,
}: {
  redemptions: VoucherRedemptionRow[];
}) {
  return (
    <DataTable
      title="Lượt sử dụng"
      columns={[
        "Thời gian",
        "Mã đơn",
        "Khách",
        "Kênh dùng",
        "Số tiền giảm",
        "Tổng đơn",
      ]}
      emptyText="Chưa có lượt sử dụng voucher nào."
    >
      {redemptions.map((row) => (
        <tr key={row.id} className="border-t border-neutral-100">
          <td className="px-3 py-3">{formatDateTime(row.createdAt)}</td>
          <td className="px-3 py-3 font-semibold text-neutral-950">
            {row.orderNumber || row.orderId || "-"}
          </td>
          <td className="px-3 py-3">{row.phone || row.customerId || "-"}</td>
          <td className="px-3 py-3">{formatChannel(row.channel)}</td>
          <td className="px-3 py-3 font-semibold text-emerald-700">
            -{formatCurrency(row.discountAmount)}
          </td>
          <td className="px-3 py-3">{formatCurrency(row.totalAfterDiscount)}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-neutral-950">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function DataTable({
  title,
  columns,
  emptyText,
  children,
}: {
  title: string;
  columns: string[];
  emptyText: string;
  children: React.ReactNode;
}) {
  const isEmpty = Array.isArray(children) && children.length === 0;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-bold text-neutral-950">{title}</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-neutral-500"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatIssueMethod(value: string) {
  if (value === "manual_phone") return "CRM / thủ công";
  if (value === "public") return "Công khai";
  if (value === "auto_after_order") return "Tự động sau đơn";
  if (value === "segment") return "Phân khúc";
  if (value === "print") return "In hóa đơn";
  if (value === "legacy_redemption") return "Suy ra từ lượt dùng cũ";
  return value;
}

function auditActionLabel(value: string) {
  const labels: Record<string, string> = {
    campaign_created: "Tạo campaign", campaign_updated: "Cập nhật",
    campaign_paused: "Tạm dừng", campaign_resumed: "Tiếp tục",
    campaign_completed: "Kết thúc", campaign_archived: "Lưu trữ",
    voucher_issued: "Phát voucher", voucher_redeemed: "Sử dụng voucher",
  };
  return labels[value] || value;
}

function formatChannel(channel?: string) {
  if (!channel) return "-";
  if (channel === "pos_pickup_now") return "Tại quầy";
  if (channel === "web_pickup_later") return "Đặt trước";
  if (channel === "web_delivery") return "Giao tận nơi";
  return channel;
}
