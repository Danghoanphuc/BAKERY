/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * genre: editorial commerce · macrostructure: Workbench (single-surface detail) · design-system: DESIGN.md · designed-as-app
 */
"use client";

import {
  ArrowLeft,
  Calculator,
  ExternalLink,
  Loader2,
  Package,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import {
  ProductLabelPrintDialog,
  labelItemsForProduct,
  labelItemsForWholesaleOffer,
} from "@/features/product-labels";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import type {
  InventoryBalance,
  InventoryBaseUnit,
  Product,
  WholesaleProduct,
} from "@/types";

type WholesaleFinishedProductWorkspaceProps = {
  product: Product;
  offer: WholesaleProduct | null;
  costingSummary: ProductCostSummary | null;
  balances: InventoryBalance[];
  onBack: () => void;
  onOfferChange: (offer: WholesaleProduct) => void;
};

type OfferDraft = {
  wholesalePrice: number;
  sellUnitLabel: string;
  unitsPerSellUnit: number;
  isAvailable: boolean;
};

function offerToDraft(offer: WholesaleProduct): OfferDraft {
  return {
    wholesalePrice: offer.wholesalePrice,
    sellUnitLabel: offer.sellUnitLabel ?? "",
    unitsPerSellUnit: offer.unitsPerSellUnit ?? 1,
    isAvailable: offer.isAvailable,
  };
}

export function WholesaleFinishedProductWorkspace({
  product,
  offer,
  costingSummary,
  balances,
  onBack,
  onOfferChange,
}: WholesaleFinishedProductWorkspaceProps) {
  const [draft, setDraft] = useState<OfferDraft | null>(
    offer ? offerToDraft(offer) : null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const unitCost = costingSummary?.totalCost ?? 0;
  const unitsPerSellUnit = Math.max(1, draft?.unitsPerSellUnit ?? 1);
  const costPerSellUnit = unitCost * unitsPerSellUnit;
  const grossProfit = (draft?.wholesalePrice ?? 0) - costPerSellUnit;
  const grossMargin = (draft?.wholesalePrice ?? 0) > 0
    ? grossProfit / (draft?.wholesalePrice ?? 1) * 100
    : null;
  const baseStock = useMemo(
    () => balances.length > 0
      ? balances.reduce((sum, balance) => sum + balance.quantity, 0)
      : Number(product.stock ?? offer?.stock ?? 0),
    [balances, offer?.stock, product.stock],
  );
  const sellUnitStock = Math.floor(baseStock / unitsPerSellUnit);
  const validationError = !draft?.sellUnitLabel.trim()
    ? "Cần nhập quy cách đóng gói."
    : draft.unitsPerSellUnit <= 0
      ? "Số sản phẩm trong một quy cách phải lớn hơn 0."
      : draft.isAvailable && draft.wholesalePrice <= 0
        ? "Cần nhập giá sỉ trước khi mở bán."
        : null;

  function update<K extends keyof OfferDraft>(key: K, value: OfferDraft[K]) {
    setSaved(false);
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  async function save() {
    if (!offer || !draft || validationError) {
      setError(validationError ?? "Không tìm thấy quy cách bán sỉ.");
      return;
    }
    setError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/wholesale/catalog/offers/${offer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json().catch(() => null) as
        | WholesaleProduct
        | { error?: string }
        | null;
      if (!response.ok || !result || !("id" in result)) {
        throw new Error(
          result && "error" in result && result.error
            ? result.error
            : "Không thể cập nhật thành phẩm bán sỉ.",
        );
      }
      onOfferChange(result);
      setSaved(true);
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : "Không thể cập nhật thành phẩm bán sỉ.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!offer || !draft) {
    return (
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-sm font-bold text-neutral-600 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại kho
          </button>
          <ProductLabelPrintDialog items={labelItemsForProduct(product, 1, product.price)} />
        </div>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="min-w-0 text-lg font-black text-amber-950 [overflow-wrap:anywhere]">
            Chưa tìm thấy quy cách bán sỉ
          </h1>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Thành phẩm có hồ sơ sản phẩm nhưng chưa có bản ghi trong danh mục bán sỉ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-sm font-bold text-neutral-600 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:text-brand-800"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Quay lại kho
          </button>
          <h1 className="mt-1 min-w-0 font-display text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-1 font-mono text-xs font-semibold text-neutral-500">
            SKU {offer.sellUnitSku || product.sku || "Chưa có"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saved && (
            <span role="status" className="text-xs font-bold text-emerald-700">
              Đã lưu
            </span>
          )}
          <ProductLabelPrintDialog
            items={labelItemsForWholesaleOffer(product, {
              wholesalePrice: draft.wholesalePrice,
              sellUnitLabel: draft.sellUnitLabel,
              unitsPerSellUnit: draft.unitsPerSellUnit,
              sellUnitSku: offer.sellUnitSku,
              sellUnitBarcode: offer.sellUnitBarcode,
              isAvailable: draft.isAvailable,
            })}
          />
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700 hover:border-brand-200 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600 active:bg-neutral-50">
            <input
              type="checkbox"
              checked={draft.isAvailable}
              onChange={(event) => update("isAvailable", event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-600"
            />
            Đang bán
          </label>
          <button
            type="button"
            onClick={() => void save()}
            disabled={isSaving || Boolean(validationError)}
            className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-[var(--color-accent-ink)] hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSaving && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isSaving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-2 border-b border-neutral-200 bg-neutral-50 lg:grid-cols-4">
          <Metric
            label={`Giá sỉ / ${draft.sellUnitLabel || "quy cách"}`}
            value={formatCurrency(draft.wholesalePrice)}
          />
          <Metric
            label="Giá vốn / quy cách"
            value={costingSummary?.source === "recipe"
              ? formatCurrency(costPerSellUnit)
              : "Chưa có"}
          />
          <Metric
            label="Biên lợi nhuận"
            value={grossMargin === null || costingSummary?.source !== "recipe"
              ? "—"
              : `${grossMargin.toFixed(1)}%`}
            tone={grossProfit < 0 ? "danger" : "default"}
          />
          <Metric
            label="Tồn khả dụng"
            value={`${formatNumber(sellUnitStock)} ${draft.sellUnitLabel || "quy cách"}`}
          />
        </div>

        <DetailSection
          icon={<Package className="h-4 w-4" aria-hidden="true" />}
          title="Giá sỉ & quy cách"
          description="Giá được tính trên một quy cách đóng gói."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              label="Giá sỉ / quy cách"
              value={draft.wholesalePrice}
              onChange={(value) => update("wholesalePrice", value)}
              min={0}
              suffix="₫"
            />
            <TextField
              label="Quy cách đóng gói"
              value={draft.sellUnitLabel}
              onChange={(value) => update("sellUnitLabel", value)}
            />
            <NumberField
              label="Số sản phẩm / quy cách"
              value={draft.unitsPerSellUnit}
              onChange={(value) => update("unitsPerSellUnit", value)}
              min={1}
              suffix={baseUnitLabel(product)}
            />
          </div>
          <div className="mt-4 grid gap-2 border-t border-neutral-200 pt-4 text-sm sm:grid-cols-3">
            <ReadOnlyLine
              label="Giá quy đổi / sản phẩm"
              value={formatCurrency(draft.wholesalePrice / unitsPerSellUnit)}
            />
            <ReadOnlyLine
              label="SKU"
              value={offer.sellUnitSku || product.sku || "Chưa có"}
            />
            <ReadOnlyLine
              label="Trạng thái"
              value={draft.isAvailable ? "Đang bán" : "Tạm ngưng"}
            />
          </div>
        </DetailSection>

        <DetailSection
          icon={<Calculator className="h-4 w-4" aria-hidden="true" />}
          title="BOM & giá vốn"
          description="Giá vốn được tính từ BOM đang hoạt động và đơn giá nguyên liệu hiện tại."
          action={(
            <Link
              href={`/wholesale/finance/costing?productId=${product.id}`}
              className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-700 hover:border-brand-200 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-neutral-50"
            >
              Cập nhật BOM
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        >
          {costingSummary?.source === "recipe" && costingSummary.recipe ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <ReadOnlyLine
                  label="Giá vốn / sản phẩm"
                  value={formatCurrency(unitCost)}
                />
                <ReadOnlyLine
                  label="Sản lượng / mẻ"
                  value={`${formatNumber(costingSummary.recipe.yieldQuantity)} ${baseUnitLabel(product)}`}
                />
                <ReadOnlyLine
                  label="Phiên bản"
                  value={`BOM v${costingSummary.recipe.version} · đang hoạt động`}
                />
              </div>
              <div className="mt-4 border-y border-neutral-200">
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_160px_150px] gap-3 border-b border-neutral-200 py-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400 md:grid">
                  <span>Thành phần</span>
                  <span className="text-right">Định lượng</span>
                  <span className="text-right">Giá vốn / đơn vị</span>
                  <span className="text-right">Thành tiền</span>
                </div>
                <div className="divide-y divide-neutral-200">
                {costingSummary.recipe.lines.map((line) => (
                  <div
                    key={`${line.ingredientId}-${line.quantity}`}
                    className="grid min-h-14 gap-2 py-3 text-sm md:grid-cols-[minmax(0,1fr)_130px_160px_150px] md:items-center md:gap-3"
                  >
                    <span className="min-w-0 font-semibold text-neutral-800">
                      {line.ingredientName}
                    </span>
                    <span className="tabular-nums text-neutral-500 md:text-right">
                      {formatNumber(line.quantity)} {ingredientUnitLabel(line.baseUnit)}
                    </span>
                    <span className="tabular-nums text-neutral-600 md:text-right">
                      {formatOptionalCurrency(line.unitCost)} / {ingredientUnitLabel(line.baseUnit)}
                    </span>
                    <span className="font-black tabular-nums text-neutral-900 md:text-right">
                      {formatOptionalCurrency(line.lineCost)}
                    </span>
                  </div>
                ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-800">
              Chưa có BOM đang hoạt động nên chưa thể tính giá vốn và biên lợi nhuận.
            </p>
          )}
        </DetailSection>

        <DetailSection
          icon={<Warehouse className="h-4 w-4" aria-hidden="true" />}
          title="Tồn kho"
          description="Tồn theo đơn vị sản phẩm; số quy cách được quy đổi theo đóng gói hiện tại."
          action={(
            <Link
              href="/wholesale/finance/operations"
              className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-200 bg-white px-3 text-xs font-bold text-neutral-700 hover:border-brand-200 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-neutral-50"
            >
              Nhập kho / sản xuất
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <ReadOnlyLine
              label="Tổng sản phẩm"
              value={`${formatNumber(baseStock)} ${baseUnitLabel(product)}`}
            />
            <ReadOnlyLine
              label="Quy đổi đóng gói"
              value={`${formatNumber(sellUnitStock)} ${draft.sellUnitLabel}`}
            />
            <ReadOnlyLine
              label="Nguồn số liệu"
              value={balances.length > 0 ? "Sổ kho vận hành" : "Chưa có số dư kho"}
            />
          </div>
          {balances.length > 0 ? (
            <div className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
              {balances.map((balance) => (
                <div
                  key={`${balance.itemId}-${balance.locationId}`}
                  className="flex min-h-11 items-center justify-between gap-4 py-2 text-sm"
                >
                  <span className="font-semibold text-neutral-800">
                    Kho {balance.locationId}
                  </span>
                  <span className="tabular-nums text-neutral-600">
                    {formatNumber(balance.quantity)} {baseUnitLabel(product)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 border-t border-neutral-200 pt-4 text-sm leading-6 text-neutral-500">
              Chưa có phiếu nhập kho hoặc mẻ sản xuất hoàn tất. Quy cách đóng gói
              và sản lượng BOM không được tính là tồn kho.
            </p>
          )}
        </DetailSection>
      </section>

      {validationError && (
        <p className="mt-2 text-right text-xs text-neutral-500">
          {validationError}
        </p>
      )}
    </div>
  );
}

function DetailSection({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid border-b border-neutral-200 last:border-b-0 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="bg-[var(--color-paper-2)] px-5 py-5">
        <div className="flex items-center gap-2 text-brand-700">
          {icon}
          <h2 className="text-base font-black text-neutral-950">{title}</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
      <div className="min-w-0 px-5 py-5">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger";
}) {
  return (
    <div className="min-w-0 border-r border-neutral-200 px-4 py-4 last:border-r-0">
      <p className="truncate text-[11px] font-semibold text-neutral-500">{label}</p>
      <p className={`mt-1 truncate text-base font-black tabular-nums ${
        tone === "danger" ? "text-red-700" : "text-neutral-950"
      }`}>
        {value}
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-2 outline-transparent outline-offset-1 placeholder:text-neutral-400 hover:border-neutral-400 focus-visible:border-brand-500 focus-visible:outline-brand-600 active:border-brand-500 disabled:cursor-not-allowed disabled:opacity-55"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  suffix?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}
      </span>
      <span className="relative block">
        <FormattedNumberInput
          aria-label={label}
          min={min}
          step={1}
          value={value}
          onValueChange={(nextValue) => onChange(nextValue ?? 0)}
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 pr-12 text-sm tabular-nums text-neutral-950 outline-2 outline-transparent outline-offset-1 hover:border-neutral-400 focus-visible:border-brand-500 focus-visible:outline-brand-600 active:border-brand-500 disabled:cursor-not-allowed disabled:opacity-55"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function ReadOnlyLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-neutral-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black tabular-nums text-neutral-900">
        {value}
      </p>
    </div>
  );
}

function baseUnitLabel(product: Product) {
  if (product.baseUnit === "gram") return "g";
  if (product.baseUnit === "millilitre") return "ml";
  return "cái";
}

function ingredientUnitLabel(unit: InventoryBaseUnit) {
  if (unit === "gram") return "g";
  if (unit === "millilitre") return "ml";
  return "cái";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatOptionalCurrency(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 3,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 3,
  }).format(Number.isFinite(value) ? value : 0);
}
