"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import type { MarketingCampaign } from "@/types";
import {
  audienceLabels,
  channelLabels,
  discountTypeLabels,
  formatCurrency,
  formatNumber,
  getVoucherMetrics,
} from "../_lib/voucher-admin";

type TabId = "overview" | "rules" | "issued" | "redemptions" | "audit";

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
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        setCampaign(nextCampaign);
        setRedemptions(redemptionsPayload.redemptions ?? []);
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
          href="/admin/vouchers"
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
          {campaign.code && (
            <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm">
              <span className="text-neutral-500">Mã voucher</span>
              <div className="mt-1 text-lg font-black text-neutral-950">
                {campaign.code}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-1">
        <div className="grid gap-1 md:grid-cols-5">
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
        <IssuedCustomersTab redemptions={redemptions} />
      )}
      {activeTab === "redemptions" && (
        <RedemptionsTab redemptions={redemptions} />
      )}
      {activeTab === "audit" && (
        <PlaceholderTable
          title="Nhật ký chỉnh sửa"
          columns={[
            "Ai chỉnh",
            "Chỉnh gì",
            "Trước đó",
            "Sau đó",
            "Lúc nào",
            "Lý do",
          ]}
          note="Tab này dành cho audit log khi campaign đã phát hành."
        />
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
  redemptions,
}: {
  redemptions: VoucherRedemptionRow[];
}) {
  const rows = useMemo(() => {
    const byPhone = new Map<string, VoucherRedemptionRow>();

    for (const redemption of redemptions) {
      const key = redemption.phone || redemption.customerId || redemption.id;
      if (!byPhone.has(key)) byPhone.set(key, redemption);
    }

    return [...byPhone.values()];
  }, [redemptions]);

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
      {rows.map((row) => (
        <tr key={row.id} className="border-t border-neutral-100">
          <td className="px-3 py-3 font-semibold text-neutral-950">
            {row.customerId ? `KH ${row.customerId.slice(0, 6)}` : "-"}
          </td>
          <td className="px-3 py-3">{row.phone || "-"}</td>
          <td className="px-3 py-3">{formatDateTime(row.createdAt)}</td>
          <td className="px-3 py-3">
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
              Đã dùng
            </span>
          </td>
          <td className="px-3 py-3">{formatChannel(row.channel)}</td>
        </tr>
      ))}
    </DataTable>
  );
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

function PlaceholderTable({
  title,
  columns,
  note,
}: {
  title: string;
  columns: string[];
  note: string;
}) {
  return (
    <DataTable title={title} columns={columns} emptyText={note}>
      {[]}
    </DataTable>
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

function formatChannel(channel?: string) {
  if (!channel) return "-";
  if (channel === "pos_pickup_now") return "Tại quầy";
  if (channel === "web_pickup_later") return "Đặt trước";
  if (channel === "web_delivery") return "Giao tận nơi";
  return channel;
}
