"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  BarChart3,
  CircleDollarSign,
  Loader2,
  Plus,
  ReceiptText,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import type {
  CostBehavior, CostCenter, CostFunction, CostTraceability, ExpenseCategory,
  ManagementAccountingSummary,
} from "@/types";

type Period = "today" | "month" | "all";

type FinanceSummary = {
  period: Period;
  revenue: {
    grossSales: number;
    discounts: number;
    netProductRevenue: number;
    deliveryFees: number;
    totalCollected: number;
    unpaidAmount: number;
  };
  costs: {
    estimatedCostOfGoods: number;
    actualCostOfGoods: number;
    costVariance: number;
    expenses: number;
    variableSellingExpenses: number;
  };
  profit: {
    grossProfit: number;
    grossMarginPercent: number;
    contributionProfit: number;
    contributionMarginPercent: number;
    operatingProfit: number;
  };
  counts: {
    orders: number;
    paidOrders: number;
    cancelledOrders: number;
  };
  byChannel: Array<{
    channel: string;
    orders: number;
    revenue: number;
    grossProfit: number;
  }>;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    estimatedCost: number;
    grossProfit: number;
  }>;
  expensesByCategory: Array<{
    category: ExpenseCategory;
    amount: number;
  }>;
  costingCoverage: {
    recipeQuantity: number;
    legacyQuantity: number;
    missingQuantity: number;
  };
};

type ExpenseForm = {
  date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string;
  note: string;
  behavior: CostBehavior;
  traceability: CostTraceability;
  costFunction: CostFunction;
  costCenterId: string;
  variablePortionPercent: number;
};

const expenseLabels: Record<ExpenseCategory, string> = {
  ingredients: "Nguyên liệu",
  payroll: "Lương",
  utilities: "Điện nước",
  packaging: "Bao bì",
  delivery: "Giao hàng",
  marketing: "Marketing",
  rent: "Mặt bằng",
  maintenance: "Sửa chữa",
  other: "Khác",
};

const channelLabels: Record<string, string> = {
  pos: "Tại quầy",
  web_delivery: "Giao tận nơi",
  web_pickup: "Đặt trước - đến lấy",
  social: "Social",
  admin: "Admin",
};

function createEmptyExpenseForm(): ExpenseForm {
  return {
    date: new Date().toISOString().slice(0, 10),
    category: "ingredients",
    amount: 0,
    vendor: "",
    note: "",
    behavior: "variable",
    traceability: "direct",
    costFunction: "production",
    costCenterId: "unclassified",
    variablePortionPercent: 50,
  };
}

export default function FinancePage() {
  const [period, setPeriod] = useState<Period>("today");
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(
    createEmptyExpenseForm(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [managementSummary, setManagementSummary] = useState<ManagementAccountingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSummary();
  }, [period]);

  useEffect(() => {
    fetch("/api/wholesale/finance/cost-centers")
      .then((response) => response.ok ? response.json() : [])
      .then((items: CostCenter[]) => setCostCenters(items.filter((item) => item.isActive)))
      .catch(() => setCostCenters([]));
  }, []);

  useEffect(() => {
    if (period !== "month") {
      setManagementSummary(null);
      return;
    }
    const managementPeriod = new Date().toISOString().slice(0, 7);
    fetch(`/api/wholesale/finance/management-summary?period=${managementPeriod}`)
      .then((response) => response.ok ? response.json() : null)
      .then(setManagementSummary)
      .catch(() => setManagementSummary(null));
  }, [period, summary]);

  async function loadSummary() {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/wholesale/finance/summary?period=${period}`);
      if (!response.ok) throw new Error("load_failed");
      setSummary(await response.json());
      setError(null);
    } catch (err) {
      console.error("Failed to load finance summary:", err);
      setError("Không thể tải dữ liệu tài chính.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingExpense(true);
    setError(null);

    try {
      const response = await fetch("/api/wholesale/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: expenseForm.date,
          category: expenseForm.category,
          amount: expenseForm.amount,
          vendor: expenseForm.vendor,
          note: expenseForm.note,
          management: {
            behavior: expenseForm.behavior,
            traceability: expenseForm.traceability,
            function: expenseForm.costFunction,
            costCenterId: expenseForm.costCenterId,
            ...(expenseForm.behavior === "mixed"
              ? { variablePortionBasisPoints: expenseForm.variablePortionPercent * 100 }
              : {}),
          },
        }),
      });
      if (!response.ok) throw new Error("save_failed");
      setExpenseForm(createEmptyExpenseForm());
      await loadSummary();
      toast.success("Đã lưu chi phí.");
    } catch (err) {
      console.error("Failed to create expense:", err);
      toast.error("Không thể lưu chi phí.");
    } finally {
      setIsSavingExpense(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-black text-neutral-950">Bức tranh tài chính</h2>
          <p className="text-xs text-neutral-500">Doanh thu, giá vốn, lãi góp và khả năng thu tiền theo kỳ.</p>
        </div>
        <div className="inline-flex self-start rounded-xl bg-neutral-100 p-1 sm:self-auto">
          {([
            ["today", "Hôm nay"],
            ["month", "Tháng này"],
            ["all", "Tất cả"],
          ] as Array<[Period, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                period === value
                  ? "bg-white text-neutral-950 shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading || !summary ? (
        <div className="grid min-h-[320px] place-items-center rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Đang tính số liệu...
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CircleDollarSign />}
              label="Doanh thu sau giảm"
              value={formatPrice(summary.revenue.netProductRevenue)}
              detail={`Giảm giá ${formatPrice(summary.revenue.discounts)}`}
            />
            <MetricCard
              icon={<ReceiptText />}
              label="Giá vốn thực tế"
              value={formatPrice(summary.costs.actualCostOfGoods)}
              detail={`Định mức ${formatPrice(summary.costs.estimatedCostOfGoods)} · Lệch ${formatPrice(summary.costs.costVariance)}`}
            />
            <MetricCard
              icon={<TrendingUp />}
              label="Lãi góp"
              value={formatPrice(summary.profit.contributionProfit)}
              detail={`Lãi gộp ${formatPrice(summary.profit.grossProfit)} · Biên ${summary.profit.contributionMarginPercent}%`}
              tone={summary.profit.contributionProfit >= 0 ? "good" : "bad"}
            />
            <MetricCard
              icon={<WalletCards />}
              label="Tiền chưa thu"
              value={formatPrice(summary.revenue.unpaidAmount)}
              detail={`Đã thu ${formatPrice(summary.revenue.totalCollected)}`}
              tone={summary.revenue.unpaidAmount > 0 ? "warn" : "good"}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
            <section className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-neutral-950">
                    Lợi nhuận theo kênh bán
                  </h2>
                  <p className="text-sm text-neutral-500">
                    So sánh tại quầy, giao tận nơi và đặt trước đến lấy.
                  </p>
                </div>
                <BarChart3 className="h-5 w-5 text-brand-500" />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead className="bg-neutral-50">
                    <tr>
                      <TableHead>Kênh</TableHead>
                      <TableHead>Đơn</TableHead>
                      <TableHead>Doanh thu</TableHead>
                      <TableHead>Lãi gộp</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {summary.byChannel.map((row) => (
                      <tr key={row.channel}>
                        <td className="px-3 py-3 text-sm font-semibold text-neutral-900">
                          {channelLabels[row.channel] ?? row.channel}
                        </td>
                        <td className="px-3 py-3 text-sm text-neutral-700">
                          {row.orders}
                        </td>
                        <td className="px-3 py-3 text-sm text-neutral-700">
                          {formatPrice(row.revenue)}
                        </td>
                        <td className="px-3 py-3 text-sm font-semibold text-neutral-900">
                          {formatPrice(row.grossProfit)}
                        </td>
                      </tr>
                    ))}
                    {summary.byChannel.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-8 text-center text-sm text-neutral-500"
                        >
                          Chưa có đơn trong kỳ này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <form
              onSubmit={createExpense}
              className="rounded-lg border border-neutral-200 bg-white p-5"
            >
              <h2 className="text-lg font-bold text-neutral-950">
                Nhập chi phí nhanh
              </h2>
              <div className="mt-4 space-y-3">
                <Field
                  label="Ngày"
                  type="date"
                  value={expenseForm.date}
                  onChange={(date) =>
                    setExpenseForm((current) => ({ ...current, date }))
                  }
                  required
                />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Nhóm chi phí
                  </span>
                  <select
                    value={expenseForm.category}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        category: event.target.value as ExpenseCategory,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  >
                    {Object.entries(expenseLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="Hành vi chi phí"
                    value={expenseForm.behavior}
                    options={[
                      ["variable", "Biến đổi"], ["fixed", "Cố định"], ["mixed", "Hỗn hợp"],
                    ]}
                    onChange={(behavior) => setExpenseForm((current) => ({
                      ...current, behavior: behavior as CostBehavior,
                    }))}
                  />
                  <SelectField
                    label="Khả năng truy nguyên"
                    value={expenseForm.traceability}
                    options={[["direct", "Trực tiếp"], ["indirect", "Gián tiếp"]]}
                    onChange={(traceability) => setExpenseForm((current) => ({
                      ...current, traceability: traceability as CostTraceability,
                    }))}
                  />
                </div>
                <SelectField
                  label="Chức năng"
                  value={expenseForm.costFunction}
                  options={[
                    ["production", "Sản xuất"], ["selling", "Bán hàng"],
                    ["administration", "Quản lý"],
                  ]}
                  onChange={(costFunction) => setExpenseForm((current) => ({
                    ...current, costFunction: costFunction as CostFunction,
                  }))}
                />
                <SelectField
                  label="Trung tâm chi phí"
                  value={expenseForm.costCenterId}
                  options={[
                    ["unclassified", "Chưa phân loại"],
                    ...costCenters.map((center) => [center.id, `${center.code} · ${center.name}`] as [string, string]),
                  ]}
                  onChange={(costCenterId) => setExpenseForm((current) => ({
                    ...current, costCenterId,
                  }))}
                />
                {expenseForm.behavior === "mixed" && (
                  <NumberField
                    label="Tỷ lệ biến đổi (%)"
                    value={expenseForm.variablePortionPercent}
                    onChange={(variablePortionPercent) => setExpenseForm((current) => ({
                      ...current,
                      variablePortionPercent: Math.min(100, variablePortionPercent),
                    }))}
                  />
                )}
                <NumberField
                  label="Số tiền"
                  value={expenseForm.amount}
                  onChange={(amount) =>
                    setExpenseForm((current) => ({ ...current, amount }))
                  }
                  required
                />
                <Field
                  label="Nhà cung cấp"
                  value={expenseForm.vendor}
                  onChange={(vendor) =>
                    setExpenseForm((current) => ({ ...current, vendor }))
                  }
                />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-neutral-700">
                    Ghi chú
                  </span>
                  <textarea
                    value={expenseForm.note}
                    onChange={(event) =>
                      setExpenseForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSavingExpense}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {isSavingExpense ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Lưu chi phí
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-lg border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Sản phẩm lời tốt
              </h2>
              <div className="mt-4 space-y-3">
                {summary.topProducts.map((product) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-950">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        SL {product.quantity} · Giá vốn{" "}
                        {formatPrice(product.estimatedCost)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-950">
                        {formatPrice(product.grossProfit)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        DT {formatPrice(product.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
                {summary.topProducts.length === 0 && (
                  <p className="rounded-lg bg-neutral-50 px-3 py-8 text-center text-sm text-neutral-500">
                    Chưa có dữ liệu sản phẩm.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-5">
              <h2 className="text-lg font-bold text-neutral-950">
                Chi phí theo nhóm
              </h2>
              <div className="mt-4 space-y-3">
                {summary.expensesByCategory.map((expense) => (
                  <div
                    key={expense.category}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-3"
                  >
                    <span className="text-sm font-semibold text-neutral-800">
                      {expenseLabels[expense.category]}
                    </span>
                    <span className="text-sm font-bold text-neutral-950">
                      {formatPrice(expense.amount)}
                    </span>
                  </div>
                ))}
                {summary.expensesByCategory.length === 0 && (
                  <p className="rounded-lg bg-neutral-50 px-3 py-8 text-center text-sm text-neutral-500">
                    Chưa có chi phí trong kỳ này.
                  </p>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
            <h2 className="text-sm font-bold text-amber-900">
              Gợi ý quản trị
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              {managementSummary?.breakEvenRevenue != null
                ? <>Doanh thu hòa vốn tháng theo lãi góp là <strong>{formatPrice(managementSummary.breakEvenRevenue)}</strong>. Lợi nhuận hoạt động quản trị hiện tại là <strong>{formatPrice(managementSummary.operatingProfit)}</strong>.</>
                : "Chọn kỳ Tháng này và phân loại chi phí để tính doanh thu hòa vốn quản trị."}
            </p>
            {managementSummary && managementSummary.budgetVariances.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {managementSummary.budgetVariances.map((variance) => (
                  <div key={variance.lineId} className="rounded-md bg-white/60 px-3 py-2 text-xs text-amber-900">
                    {variance.metric}: kế hoạch {formatPrice(variance.plannedAmount)} · thực tế {formatPrice(variance.actualAmount)} ·
                    <strong className={variance.favorable ? "text-emerald-700" : "text-red-700"}> {variance.variancePercent ?? "—"}%</strong>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-amber-700">
              Bao phủ giá vốn: BOM {summary.costingCoverage.recipeQuantity} SP ·
              Legacy {summary.costingCoverage.legacyQuantity} SP ·
              Thiếu giá vốn {summary.costingCoverage.missingQuantity} SP.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warn"
        ? "bg-amber-50 text-amber-700"
        : tone === "bad"
          ? "bg-red-50 text-red-700"
          : "bg-brand-50 text-brand-700";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-lg p-2 ${toneClass}`}>
        {icon}
      </div>
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-950">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{detail}</p>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </th>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type="number"
        min={0}
        required={required}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
