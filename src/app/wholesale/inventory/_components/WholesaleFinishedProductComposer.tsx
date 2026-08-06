/* Hallmark · pre-emit critique: P5 H4 E4 S5 R4 V4
 * genre: editorial commerce · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app
 */
"use client";

import { ArrowLeft, Calculator, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import type { FinanceIngredient, Product, RecipeVersion } from "@/types";
import { RecipeSupplementalCostEditor } from "@/app/wholesale/finance/costing/_components/RecipeSupplementalCostEditor";
import {
  calculateWholesaleCostPreview,
  createEmptyWholesaleFinishedProductComposer,
  getWholesaleFinishedProductComposerError,
  wholesaleFinishedProductComposerToPayload,
  type WholesaleFinishedProductComposerData,
} from "../_lib/wholesale-finished-product-composer";

export function WholesaleFinishedProductComposer() {
  const router = useRouter();
  const [formData, setFormData] = useState(
    createEmptyWholesaleFinishedProductComposer,
  );
  const [ingredients, setIngredients] = useState<FinanceIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/wholesale/finance/ingredients", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không thể tải danh sách nguyên liệu.");
        return await response.json() as FinanceIngredient[];
      })
      .then((items) => {
        if (!cancelled) setIngredients(items.filter((item) => item.isActive));
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error
            ? loadError.message
            : "Không thể tải danh sách nguyên liệu.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/wholesale/products", { cache: "no-store" }),
      fetch("/api/wholesale/finance/recipes", { cache: "no-store" }),
      fetch("/api/wholesale/finance/costing-summary", { cache: "no-store" }),
    ]).then(async ([productResponse, recipeResponse, costingResponse]) => {
      if (!productResponse.ok || !recipeResponse.ok || cancelled) return;
      const products = await productResponse.json() as Product[];
      const recipes = await recipeResponse.json() as RecipeVersion[];
      const costing = costingResponse.ok
        ? await costingResponse.json() as {
            byProductId?: Record<string, { totalCost?: number }>;
          }
        : {};
      const activeRecipeProductIds = new Set(
        recipes
          .filter((recipe) => recipe.status === "active")
          .map((recipe) => recipe.productId),
      );
      const components = products
        .filter((product) =>
          product.itemType === "semi_finished" &&
          activeRecipeProductIds.has(product.id))
        .map((product) => ({
          id: product.id,
          code: `BTP-${product.sku ?? product.id}`,
          name: `[Bán thành phẩm] ${product.name}`,
          baseUnit: product.baseUnit ?? "each",
          costPerBaseUnitMicros: Math.round(
            Number(costing.byProductId?.[product.id]?.totalCost ?? 0) *
              1_000_000,
          ),
          isActive: true,
        } satisfies FinanceIngredient));
      if (!cancelled) {
        setIngredients((current) => [
          ...current.filter((item) => !item.code.startsWith("BTP-")),
          ...components,
        ]);
      }
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const cost = useMemo(
    () => calculateWholesaleCostPreview(formData, ingredients),
    [formData, ingredients],
  );
  const costPerSellUnit = cost.totalCost * formData.unitsPerSellUnit;
  const grossProfit = formData.wholesalePrice - costPerSellUnit;
  const grossMargin = formData.wholesalePrice > 0
    ? grossProfit / formData.wholesalePrice * 100
    : 0;
  const validationError = getWholesaleFinishedProductComposerError(formData);

  function update<K extends keyof WholesaleFinishedProductComposerData>(
    key: K,
    value: WholesaleFinishedProductComposerData[K],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function updateBomLine(
    id: string,
    patch: Partial<WholesaleFinishedProductComposerData["bomLines"][number]>,
  ) {
    setFormData((current) => ({
      ...current,
      bomLines: current.bomLines.map((line) =>
        line.id === id ? { ...line, ...patch } : line),
    }));
  }

  function addBomLine() {
    setFormData((current) => ({
      ...current,
      bomLines: [
        ...current.bomLines,
        {
          id: `bom-line-${crypto.randomUUID()}`,
          ingredientId: "",
          quantity: 0,
          componentType: "ingredient",
        },
      ],
    }));
  }

  function removeBomLine(id: string) {
    setFormData((current) => ({
      ...current,
      bomLines: current.bomLines.length === 1
        ? current.bomLines
        : current.bomLines.filter((line) => line.id !== id),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/wholesale/catalog/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wholesaleFinishedProductComposerToPayload(formData)),
      });
      const result = await response.json().catch(() => null) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.error || "Không thể tạo thành phẩm bán sỉ.");
      }
      router.push("/wholesale/inventory");
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : "Không thể tạo thành phẩm bán sỉ.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-neutral-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Đang tải nguyên liệu…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="mb-6">
        <Link
          href="/wholesale/inventory"
          className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-sm font-bold text-neutral-600 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:text-brand-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại kho
        </Link>
        <h1 className="mt-2 min-w-0 font-display text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-3xl">
          Tạo thành phẩm bán sỉ
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
          Khai báo sản phẩm, quy cách bán và BOM. Giá vốn được tính ngay từ
          định mức nguyên liệu.
        </p>
      </header>

      <form onSubmit={submit}>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {error && (
            <div
              role="alert"
              className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700"
            >
              {error}
            </div>
          )}

          <FormSection
            index="01"
            title="Sản phẩm"
            description="Thông tin nhận diện tối thiểu trong kho."
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
              <TextField
                label="Tên sản phẩm"
                value={formData.name}
                onChange={(value) => update("name", value)}
                placeholder="Ví dụ: Croissant bơ 80g"
                required
              />
              <TextField
                label="SKU"
                value={formData.sku}
                onChange={(value) => update("sku", value.toUpperCase())}
                placeholder="Để trống để tự cấp"
              />
            </div>
          </FormSection>

          <FormSection
            index="02"
            title="Giá sỉ & quy cách"
            description="Giá sỉ được tính trên một quy cách đóng gói."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField
                label="Giá sỉ / quy cách"
                value={formData.wholesalePrice}
                onChange={(value) => update("wholesalePrice", value)}
                min={0}
                suffix="₫"
                required
              />
              <TextField
                label="Quy cách đóng gói"
                value={formData.sellUnitLabel}
                onChange={(value) => update("sellUnitLabel", value)}
                placeholder="Thùng 24, khay 6…"
                required
              />
              <NumberField
                label="Số sản phẩm / quy cách"
                value={formData.unitsPerSellUnit}
                onChange={(value) => update("unitsPerSellUnit", value)}
                min={1}
                suffix="cái"
                required
              />
            </div>
          </FormSection>

          <FormSection
            index="03"
            title="BOM & giá vốn"
            description="Nhập lượng nguyên liệu cho một mẻ; hệ thống tự chia giá vốn theo sản lượng đạt chuẩn."
          >
            <div className="mb-4 grid gap-4 sm:grid-cols-[15rem_minmax(0,1fr)] sm:items-end">
              <NumberField
                label="Sản lượng đạt chuẩn / mẻ"
                value={formData.yieldQuantity}
                onChange={(value) => update("yieldQuantity", value)}
                min={1}
                suffix="cái"
                required
              />
              <p className="pb-2 text-xs leading-5 text-neutral-500">
                Ví dụ một mẻ làm được 24 bánh thì nhập 24. Định lượng bên dưới
                là tổng cho cả mẻ.
              </p>
            </div>

            <div className="border-y border-neutral-200">
              <div className="hidden grid-cols-[minmax(0,1fr)_11rem_3rem] gap-2 bg-neutral-50 px-3 py-2 text-xs font-bold text-neutral-500 sm:grid">
                <span>Nguyên liệu</span>
                <span>Định lượng / mẻ</span>
                <span />
              </div>
              <div className="divide-y divide-neutral-200">
                {formData.bomLines.map((line, index) => {
                  const ingredient = ingredients.find(
                    (item) => item.id === line.ingredientId,
                  );
                  return (
                    <div
                      key={line.id}
                      className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_11rem_3rem] sm:items-end"
                    >
                      <SelectField
                        label={index === 0 ? "Nguyên liệu" : `Nguyên liệu ${index + 1}`}
                        hideLabel
                        value={line.ingredientId}
                        onChange={(ingredientId) => {
                          const component = ingredients.find(
                            (item) => item.id === ingredientId,
                          );
                          updateBomLine(line.id, {
                            ingredientId,
                            componentType: component?.code.startsWith("BTP-")
                              ? "semi_finished"
                              : "ingredient",
                          });
                        }}
                      >
                        <option value="">Chọn nguyên liệu / bán thành phẩm</option>
                        {ingredients.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {formatIngredientCost(item)}
                          </option>
                        ))}
                      </SelectField>
                      <NumberField
                        label={`Định lượng nguyên liệu ${index + 1}`}
                        hideLabel
                        value={line.quantity}
                        onChange={(quantity) => updateBomLine(line.id, { quantity })}
                        min={1}
                        suffix={unitLabel(ingredient?.baseUnit)}
                      />
                      <button
                        type="button"
                        onClick={() => removeBomLine(line.id)}
                        disabled={formData.bomLines.length === 1}
                        className="grid h-11 w-11 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-red-100 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Xóa nguyên liệu ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={addBomLine}
                className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-brand-200"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Thêm nguyên liệu
              </button>
              {ingredients.length === 0 && (
                <p className="text-xs text-amber-800">
                  Chưa có nguyên liệu.{" "}
                  <Link
                    href="/wholesale/inventory/new/ingredient"
                    className="font-bold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:text-brand-800"
                  >
                    Tạo nguyên liệu trước
                  </Link>
                </p>
              )}
            </div>

            <details className="mt-5 border-t border-neutral-200 pt-4">
              <summary className="cursor-pointer text-sm font-bold text-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:text-neutral-950">
                Chi phí bổ sung và hao hụt
              </summary>
              <div className="mt-4">
                <RecipeSupplementalCostEditor
                  values={formData}
                  onChange={(patch) => setFormData((current) => ({ ...current, ...patch }))}
                  packagingCostLines={formData.packagingCostLines}
                  onPackagingCostLinesChange={(packagingCostLines) => update("packagingCostLines", packagingCostLines)}
                  directLaborCostLines={formData.directLaborCostLines}
                  onDirectLaborCostLinesChange={(directLaborCostLines) => update("directLaborCostLines", directLaborCostLines)}
                  wasteCalculation={formData.wasteCalculation}
                  onWasteCalculationChange={(wasteCalculation) => update("wasteCalculation", wasteCalculation)}
                  batchCycleMinutes={0}
                  yieldQuantity={formData.yieldQuantity}
                />
              </div>
            </details>
          </FormSection>

          <div className="grid border-t border-neutral-200 bg-neutral-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="grid grid-cols-3 divide-x divide-neutral-200">
              <CostMetric
                label="Giá vốn / sản phẩm"
                value={formatCurrency(cost.totalCost)}
                icon={<Calculator className="h-3.5 w-3.5" aria-hidden="true" />}
              />
              <CostMetric
                label="Giá vốn / quy cách"
                value={formatCurrency(costPerSellUnit)}
              />
              <CostMetric
                label="Lãi gộp dự kiến"
                value={formData.wholesalePrice > 0
                  ? `${formatCurrency(grossProfit)} · ${grossMargin.toFixed(1)}%`
                  : "—"}
                tone={grossProfit < 0 ? "danger" : "default"}
              />
            </div>
            <div className="flex gap-2 border-t border-neutral-200 p-4 sm:border-l sm:border-t-0">
              <button
                type="button"
                onClick={() => router.push("/wholesale/inventory")}
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-neutral-300 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving || Boolean(validationError)}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-[var(--color-accent-ink)] transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving && (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isSaving ? "Đang tạo…" : "Tạo thành phẩm"}
              </button>
            </div>
          </div>
        </div>
        {validationError && !error && (
          <p className="mt-2 text-right text-xs leading-5 text-neutral-500">
            {validationError}
          </p>
        )}
      </form>
    </div>
  );
}

function FormSection({
  index,
  title,
  description,
  children,
}: {
  index: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid border-b border-neutral-200 last:border-b-0 md:grid-cols-[12rem_minmax(0,1fr)]">
      <div className="bg-[var(--color-paper-2)] px-5 py-5">
        <p className="font-mono text-xs font-bold text-brand-700">{index}</p>
        <h2 className="mt-1 text-base font-black text-neutral-950">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
      </div>
      <div className="min-w-0 px-5 py-5">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
  required,
  hideLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
  required?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <label>
      <span className={hideLabel
        ? "sr-only"
        : "mb-1.5 block text-sm font-semibold text-neutral-700"}
      >
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      <span className="relative block">
        <FormattedNumberInput
          aria-label={label}
          min={min}
          max={max}
          step={1}
          value={value}
          onValueChange={(nextValue) => onChange(nextValue ?? 0)}
          required={required}
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 pr-12 text-sm tabular-nums text-neutral-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
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

function SelectField({
  label,
  value,
  onChange,
  children,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  hideLabel?: boolean;
}) {
  return (
    <label>
      <span className={hideLabel
        ? "sr-only"
        : "mb-1.5 block text-sm font-semibold text-neutral-700"}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {children}
      </select>
    </label>
  );
}

function CostMetric({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <div className="min-w-0 px-4 py-3">
      <p className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
        {icon}{label}
      </p>
      <p className={`mt-1 truncate text-sm font-black tabular-nums ${
        tone === "danger" ? "text-red-700" : "text-neutral-950"
      }`}>
        {value}
      </p>
    </div>
  );
}

function unitLabel(unit?: FinanceIngredient["baseUnit"]) {
  if (unit === "gram") return "g";
  if (unit === "millilitre") return "ml";
  if (unit === "each") return "cái";
  return "";
}

function formatIngredientCost(ingredient: FinanceIngredient) {
  const amount = ingredient.costPerBaseUnitMicros / 1_000_000;
  return `${formatCurrency(amount)}/${unitLabel(ingredient.baseUnit)}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
