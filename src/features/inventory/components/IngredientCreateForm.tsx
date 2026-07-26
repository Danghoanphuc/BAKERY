/* Hallmark · genre: editorial · macrostructure: Workbench · design-system: design.md · designed-as-app */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CircleDashed,
  Loader2,
  PackageCheck,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import { createProductSkuPattern } from "@/lib/product-identifiers";
import type { InventoryBaseUnit, Product } from "@/types";
import { CreateItemShell } from "./CreateItemShell";
import {
  IngredientGroupSelector,
  type IngredientGroupSelection,
} from "./IngredientGroupSelector";

type IngredientFormData = {
  name: string;
  imageUrl: string;
  ingredientGroup: string;
  ingredientGroupId: string;
  ingredientSubgroupId: string;
  baseUnit: InventoryBaseUnit;
  purchaseUnit: string;
  purchasePackQuantity: number;
  referencePurchasePrice: number;
  stock: number;
  minimumStock: number;
  preferredSupplier: string;
  shelfLife: string;
  storage: string;
};

const initialData: IngredientFormData = {
  name: "",
  imageUrl: "",
  ingredientGroup: "",
  ingredientGroupId: "",
  ingredientSubgroupId: "",
  baseUnit: "gram",
  purchaseUnit: "túi",
  purchasePackQuantity: 1000,
  referencePurchasePrice: 0,
  stock: 0,
  minimumStock: 0,
  preferredSupplier: "",
  shelfLife: "",
  storage: "",
};

export function IngredientCreateForm({
  apiPath,
  inventoryPath,
}: {
  apiPath: string;
  inventoryPath: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const skuPreview = useMemo(
    () => createProductSkuPattern({ itemType: "ingredient", name: data.name }),
    [data.name],
  );
  const purchaseUnitName = data.purchaseUnit.trim() || "đơn vị mua";
  const isDirectPurchase = isSameInventoryUnit(
    data.purchaseUnit,
    data.baseUnit,
  );
  const purchaseQuantity = isDirectPurchase
    ? 1
    : data.purchasePackQuantity;
  const unitCost =
    purchaseQuantity > 0
      ? data.referencePurchasePrice / purchaseQuantity
      : 0;

  const update = <K extends keyof IngredientFormData>(
    key: K,
    value: IngredientFormData[K],
  ) => setData((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (
      !data.name.trim() ||
      !data.ingredientGroupId ||
      !data.purchaseUnit.trim()
    ) {
      setError("Vui lòng nhập tên, nhóm nguyên liệu và đơn vị mua.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          purchasePackQuantity: purchaseQuantity,
          itemType: "ingredient",
          lifecycleStatus: "active",
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | Product
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(
          (payload as { error?: string } | null)?.error ||
            "Không thể tạo nguyên liệu.",
        );
      }
      const product = payload as Product;
      router.push(`${inventoryPath}/${product.id}`);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo nguyên liệu.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CreateItemShell
      backHref={inventoryPath}
      eyebrow="Mã kho · Nguyên liệu"
      title="Tạo nguyên liệu"
      description="Hồ sơ mua hàng và tồn kho nội bộ. Nguyên liệu không có giá bán, biến thể hay quyền xuất bản ra cửa hàng."
    >
      <form
        onSubmit={submit}
        className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
      >
        <div className="min-w-0 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
            >
              {error}
            </div>
          )}

          <FormSection
            title="Hồ sơ nguyên liệu"
            description="Ảnh đại diện, tên nội bộ, mã kho và vị trí của nguyên liệu trong hệ thống phân loại."
          >
            <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_10rem] md:items-start">
              <div className="min-w-0">
                <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.6fr)]">
                  <Field label="Tên nguyên liệu" required>
                    <input
                      autoFocus
                      value={data.name}
                      onChange={(event) => update("name", event.target.value)}
                      className={inputClass}
                      placeholder="Ví dụ: Bột mì số 13"
                      aria-required="true"
                    />
                  </Field>
                  <Field label="Mã nguyên liệu">
                    <input
                      readOnly
                      value={skuPreview}
                      className={`${inputClass} bg-neutral-50 font-mono text-neutral-600`}
                      aria-describedby="ingredient-sku-note"
                    />
                    <p
                      id="ingredient-sku-note"
                      className="mt-1.5 min-h-5 text-xs leading-5 text-neutral-500"
                    >
                      Mã chính thức được cấp khi lưu.
                    </p>
                  </Field>
                </div>
                <div className="mt-5">
                  <span className="mb-1.5 block text-sm font-bold text-neutral-800">
                    Nhóm nguyên liệu<span className="ml-1 text-red-500">*</span>
                  </span>
                  <IngredientGroupSelector
                    apiPath={
                      apiPath.startsWith("/api/wholesale")
                        ? "/api/wholesale/inventory/ingredient-groups"
                        : "/api/admin/inventory/ingredient-groups"
                    }
                    groupId={data.ingredientGroupId}
                    subgroupId={data.ingredientSubgroupId}
                    legacyValue={data.ingredientGroup}
                    onChange={(selection: IngredientGroupSelection) =>
                      setData((current) => ({
                        ...current,
                        ingredientGroup: selection.displayName,
                        ingredientGroupId: selection.groupId,
                        ingredientSubgroupId: selection.subgroupId,
                        storage:
                          current.storage || selection.defaultStorage || "",
                        shelfLife:
                          current.shelfLife ||
                          selection.defaultShelfLife ||
                          "",
                      }))
                    }
                  />
                </div>
              </div>
              <div className="w-full max-w-40">
                <AdminImageUploader
                  value={data.imageUrl}
                  onChange={(imageUrl) => update("imageUrl", imageUrl)}
                  label="Ảnh nguyên liệu"
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Thông tin mua hàng"
            description="Nhập theo đúng cách nhà cung cấp đóng gói và báo giá nguyên liệu."
          >
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <Field label="Theo dõi tồn kho bằng" required>
                <select
                  value={data.baseUnit}
                  onChange={(event) =>
                    update("baseUnit", event.target.value as InventoryBaseUnit)
                  }
                  className={inputClass}
                  aria-required="true"
                >
                  <option value="gram">Gram (g)</option>
                  <option value="millilitre">Millilitre (ml)</option>
                  <option value="each">Cái / chiếc</option>
                </select>
              </Field>
              <Field label="Mua theo" required>
                <input
                  value={data.purchaseUnit}
                  onChange={(event) =>
                    update("purchaseUnit", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Ví dụ: túi, bao, thùng, chai"
                  aria-required="true"
                />
              </Field>
              {isDirectPurchase ? (
                <div className="flex min-h-12 items-center rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm leading-6 text-neutral-600 sm:col-span-2">
                  Mua và theo dõi tồn kho cùng một đơn vị — không cần quy đổi.
                </div>
              ) : (
                <Field label={`Mỗi ${purchaseUnitName} chứa`} required>
                  <div className="grid grid-cols-[minmax(0,1fr)_4.5rem]">
                    <NumberInput
                      value={data.purchasePackQuantity}
                      onChange={(value) =>
                        update("purchasePackQuantity", value)
                      }
                      min={0.001}
                      className="rounded-r-none"
                    />
                    <span className="grid h-12 place-items-center rounded-r-xl border border-l-0 border-neutral-300 bg-neutral-50 text-sm font-bold text-neutral-700">
                      {baseUnitLabel(data.baseUnit)}
                    </span>
                  </div>
                </Field>
              )}
              <Field label={`Giá một ${purchaseUnitName}`}>
                <NumberInput
                  value={data.referencePurchasePrice}
                  onChange={(value) => update("referencePurchasePrice", value)}
                  suffix="đ"
                />
              </Field>
              <div className={isDirectPurchase ? "" : "sm:col-span-2"}>
                <Field label="Nhà cung cấp ưu tiên">
                  <input
                    value={data.preferredSupplier}
                    onChange={(event) =>
                      update("preferredSupplier", event.target.value)
                    }
                    className={inputClass}
                    placeholder="Không bắt buộc"
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Tồn kho và bảo quản"
            description="Đặt ngưỡng cảnh báo và điều kiện vận hành cho lô nguyên liệu đầu tiên."
          >
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <Field label="Tồn ban đầu">
                <NumberInput
                  value={data.stock}
                  onChange={(value) => update("stock", value)}
                />
              </Field>
              <Field label="Mức tồn tối thiểu">
                <NumberInput
                  value={data.minimumStock}
                  onChange={(value) => update("minimumStock", value)}
                />
              </Field>
              <Field label="Hạn sử dụng">
                <input
                  value={data.shelfLife}
                  onChange={(event) => update("shelfLife", event.target.value)}
                  className={inputClass}
                  placeholder="Ví dụ: 6 tháng"
                />
              </Field>
              <Field label="Điều kiện bảo quản">
                <input
                  value={data.storage}
                  onChange={(event) => update("storage", event.target.value)}
                  className={inputClass}
                  placeholder="Khô ráo, tránh ánh nắng"
                />
              </Field>
            </div>
          </FormSection>
        </div>

        <aside className="lg:sticky lg:top-5">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <PackageCheck className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-neutral-950">
                    Kiểm tra hồ sơ
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Chỉ dùng trong vận hành nội bộ
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-100 px-5">
              <SummaryRow
                icon={<Tag className="h-4 w-4" />}
                label="Mã dự kiến"
                value={skuPreview}
              />
              <SummaryRow
                icon={
                  data.ingredientGroupId ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <CircleDashed className="h-4 w-4" />
                  )
                }
                label="Phân loại"
                value={data.ingredientGroup || "Chưa chọn nhóm"}
                ready={Boolean(data.ingredientGroupId)}
              />
              <SummaryRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Khi nhập kho"
                value={
                  isDirectPurchase
                    ? "Không cần quy đổi"
                    : `1 ${purchaseUnitName} = ${formatNumber(purchaseQuantity)} ${baseUnitLabel(data.baseUnit)}`
                }
              />
              <SummaryRow
                icon={<PackageCheck className="h-4 w-4" />}
                label="Giá quy đổi"
                value={
                  data.referencePurchasePrice > 0
                    ? `${formatCurrency(unitCost)} / ${baseUnitLabel(data.baseUnit)}`
                    : "Chưa nhập giá mua"
                }
              />
            </div>
            <div className="space-y-2 border-t border-neutral-200 bg-neutral-50 p-4">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-bg-card transition-colors hover:bg-brand-700 active:bg-brand-800 disabled:cursor-wait disabled:opacity-50"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Đang tạo…" : "Tạo nguyên liệu"}
              </button>
              <Link
                href={inventoryPath}
                className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                Hủy
              </Link>
            </div>
          </div>
        </aside>
      </form>
    </CreateItemShell>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3.5 pr-9 text-sm text-neutral-950 outline-2 outline-transparent outline-offset-1 transition-colors placeholder:text-neutral-400 hover:bg-neutral-50 focus-visible:border-neutral-400 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-55";

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <header className="border-b border-neutral-200 px-5 py-4 sm:px-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-neutral-950">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          {description}
        </p>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  ready = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ready?: boolean;
}) {
  return (
    <div className="flex gap-3 py-4">
      <span
        className={
          ready
            ? "mt-0.5 text-brand-600"
            : "mt-0.5 text-neutral-400"
        }
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-neutral-500">{label}</p>
        <p className="mt-1 break-words text-sm font-bold leading-5 text-neutral-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function baseUnitLabel(unit: InventoryBaseUnit) {
  if (unit === "millilitre") return "ml";
  if (unit === "each") return "cái";
  return "g";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 2,
  }).format(value);
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-neutral-800">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  className = "",
  suffix,
  maximumFractionDigits,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  className?: string;
  suffix?: string;
  maximumFractionDigits?: number;
}) {
  const fractionDigits =
    maximumFractionDigits ??
    (suffix === "đ" || suffix === "phút" || suffix === "cái" ? 0 : 3);

  if (suffix) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_3rem]">
        <FormattedNumberInput
          min={min}
          step={fractionDigits > 0 ? "any" : 1}
          value={value}
          onValueChange={(nextValue) => onChange(nextValue ?? 0)}
          maximumFractionDigits={fractionDigits}
          className={`${inputClass} rounded-r-none ${className}`}
        />
        <span className="grid h-12 place-items-center rounded-r-xl border border-l-0 border-neutral-300 bg-neutral-50 text-sm font-bold text-neutral-700">
          {suffix}
        </span>
      </div>
    );
  }

  return (
    <FormattedNumberInput
      min={min}
      step={fractionDigits > 0 ? "any" : 1}
      value={value}
      onValueChange={(nextValue) => onChange(nextValue ?? 0)}
      maximumFractionDigits={fractionDigits}
      className={`${inputClass} ${className}`}
    />
  );
}

function isSameInventoryUnit(
  purchaseUnit: string,
  baseUnit: InventoryBaseUnit,
) {
  const normalized = purchaseUnit
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\s]/g, "");

  if (baseUnit === "gram") {
    return ["g", "gr", "gram", "gam"].includes(normalized);
  }
  if (baseUnit === "millilitre") {
    return ["ml", "millilitre", "milliliter"].includes(normalized);
  }
  return ["cai", "chiec", "each"].includes(normalized);
}

export function FormActions({
  cancelHref,
  isSaving,
  label,
}: {
  cancelHref: string;
  isSaving: boolean;
  label: string;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-4 sm:px-6">
      <Link
        href={cancelHref}
        className="h-11 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
      >
        Hủy
      </Link>
      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-neutral-950 px-5 text-sm font-bold text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-55"
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </button>
    </div>
  );
}
