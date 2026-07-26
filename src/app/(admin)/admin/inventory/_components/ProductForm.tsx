"use client";

import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { Check, CircleDashed, Loader2, PackageCheck } from "lucide-react";
import { clsx } from "clsx";
import type { Category, FlavorOption, ProductVariantCombination, SizeOption } from "@/types";
import type { ProductCostSummary } from "@/features/finance";
import {
  createInternalBarcode,
  createProductSku,
  createProductSkuPattern,
  createVariantSku,
} from "@/lib/product-identifiers";
import type { ProductFormData } from "../_lib/product-form";
import {
  CostingSection,
  DisplayLabelsSection,
  LogisticsSection,
  MetadataSection,
  OperationsSection,
  ProductMediaSection,
  SalesAvailabilitySection,
  SalesInfoSection,
  StorefrontSection,
  VariantSection,
} from "./ProductFormSections";

export type ProductFormTab = "basics" | "variants" | "operations" | "pricing";

export const productFormTabs: Array<{ id: ProductFormTab; label: string }> = [
  { id: "basics", label: "Cơ bản" },
  { id: "variants", label: "Biến thể" },
  { id: "operations", label: "Vận hành" },
  { id: "pricing", label: "Giá & nội dung" },
];

export function useProductVariantEditor(
  setFormData: Dispatch<SetStateAction<ProductFormData>>,
) {
  const addSizeOption = () => {
    setFormData((prev) => ({
      ...prev,
      sizeOptions: [
        ...prev.sizeOptions,
        { id: crypto.randomUUID(), label: "", priceAdjustment: 0 },
      ],
    }));
  };

  const updateSizeOption = (
    index: number,
    field: keyof SizeOption,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const nextSizes = [...prev.sizeOptions];
      nextSizes[index] = { ...nextSizes[index], [field]: value };
      return { ...prev, sizeOptions: nextSizes };
    });
  };

  const removeSizeOption = (index: number) => {
    setFormData((prev) => {
      const removedId = prev.sizeOptions[index]?.id;
      return {
        ...prev,
        sizeOptions: prev.sizeOptions.filter((_, itemIndex) => itemIndex !== index),
        variantCombinations: prev.variantCombinations.filter(
          (combination) => combination.sizeOptionId !== removedId,
        ),
      };
    });
  };

  const addFlavorOption = () => {
    setFormData((prev) => ({
      ...prev,
      flavorOptions: [
        ...prev.flavorOptions,
        { id: crypto.randomUUID(), label: "", priceAdjustment: 0 },
      ],
    }));
  };

  const updateFlavorOption = (
    index: number,
    field: keyof FlavorOption,
    value: string | number,
  ) => {
    setFormData((prev) => {
      const nextFlavors = [...prev.flavorOptions];
      nextFlavors[index] = { ...nextFlavors[index], [field]: value };
      return { ...prev, flavorOptions: nextFlavors };
    });
  };

  const removeFlavorOption = (index: number) => {
    setFormData((prev) => {
      const removedId = prev.flavorOptions[index]?.id;
      return {
        ...prev,
        flavorOptions: prev.flavorOptions.filter(
          (_, itemIndex) => itemIndex !== index,
        ),
        variantCombinations: prev.variantCombinations.filter(
          (combination) => combination.flavorOptionId !== removedId,
        ),
      };
    });
  };

  const generateVariantCombinations = () => {
    setFormData((prev) => {
      if (!prev.sizeOptions.length || !prev.flavorOptions.length) return prev;

      const sku = prev.sku.trim() || createProductSku({ itemType: prev.itemType, name: prev.name });
      const barcode = prev.barcode.trim() || createInternalBarcode();

      const existing = new Map(
        prev.variantCombinations.map((combination) => [
          `${combination.sizeOptionId}:${combination.flavorOptionId}`,
          combination,
        ]),
      );
      const variantCombinations = prev.sizeOptions.flatMap((size) =>
        prev.flavorOptions.map((flavor) => {
          const key = `${size.id}:${flavor.id}`;
          return existing.get(key) ?? {
            id: crypto.randomUUID(),
            sizeOptionId: size.id,
            flavorOptionId: flavor.id,
            priceAdjustment:
              (Number(size.priceAdjustment) || 0) +
              (Number(flavor.priceAdjustment) || 0),
            stock: 0,
            isAvailable: true,
            sku: createVariantSku({ productSku: sku, sizeLabel: size.label, flavorLabel: flavor.label }),
            barcode: createInternalBarcode(),
          };
        }),
      );
      return { ...prev, sku, barcode, variantCombinations };
    });
  };

  const assignMissingVariantIdentifiers = () => {
    setFormData((prev) => {
      const sku = prev.sku.trim() || createProductSku({ itemType: prev.itemType, name: prev.name });
      const barcode = prev.barcode.trim() || createInternalBarcode();
      const hasCombinations = prev.variantCombinations.length > 0;
      return {
        ...prev,
        sku,
        barcode,
        sizeOptions: !hasCombinations
          ? prev.sizeOptions.map((size) => ({
              ...size,
              sku: size.sku?.trim() || createVariantSku({ productSku: sku, sizeLabel: size.label, flavorLabel: "" }),
              barcode: size.barcode?.trim() || createInternalBarcode(),
            }))
          : prev.sizeOptions,
        flavorOptions: !hasCombinations
          ? prev.flavorOptions.map((flavor) => ({
              ...flavor,
              sku: flavor.sku?.trim() || createVariantSku({ productSku: sku, sizeLabel: "", flavorLabel: flavor.label }),
              barcode: flavor.barcode?.trim() || createInternalBarcode(),
            }))
          : prev.flavorOptions,
        variantCombinations: prev.variantCombinations.map((combination) => {
          const size = prev.sizeOptions.find((option) => option.id === combination.sizeOptionId);
          const flavor = prev.flavorOptions.find((option) => option.id === combination.flavorOptionId);
          if (!size || !flavor) return combination;
          return {
            ...combination,
            sku: combination.sku?.trim() || createVariantSku({ productSku: sku, sizeLabel: size.label, flavorLabel: flavor.label }),
            barcode: combination.barcode?.trim() || createInternalBarcode(),
          };
        }),
      };
    });
  };

  const updateVariantCombination = (
    id: string,
    field: keyof ProductVariantCombination,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      variantCombinations: prev.variantCombinations.map((combination) =>
        combination.id === id ? { ...combination, [field]: value } : combination,
      ),
    }));
  };

  return {
    addSizeOption,
    updateSizeOption,
    removeSizeOption,
    addFlavorOption,
    updateFlavorOption,
    removeFlavorOption,
    generateVariantCombinations,
    assignMissingVariantIdentifiers,
    updateVariantCombination,
  };
}

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string | null;
  categories: Category[];
  formData: ProductFormData;
  assistantNote: string | null;
  error?: string | null;
  costingSummary?: ProductCostSummary | null;
  isSaving: boolean;
  basicsIncomplete?: boolean;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onApplyAssistant: () => void;
  activeTab?: ProductFormTab;
  onActiveTabChange?: (tab: ProductFormTab) => void;
  hideNavigation?: boolean;
  hideActions?: boolean;
  formId?: string;
};

export function ProductForm({
  mode,
  productId = null,
  categories,
  formData,
  assistantNote,
  error = null,
  costingSummary = null,
  isSaving,
  basicsIncomplete = false,
  setFormData,
  onCancel,
  onSubmit,
  onApplyAssistant,
  activeTab: controlledActiveTab,
  onActiveTabChange,
  hideNavigation = false,
  hideActions = false,
  formId,
}: ProductFormProps) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] =
    useState<ProductFormTab>("basics");
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab;

  const setActiveTab = (tab: ProductFormTab) => {
    if (controlledActiveTab === undefined) {
      setUncontrolledActiveTab(tab);
    }
    onActiveTabChange?.(tab);
  };

  const variantEditor = useProductVariantEditor(setFormData);

  if (mode === "create") {
    return (
      <form
        id={formId}
        onSubmit={onSubmit}
        className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
      >
        <div className="min-w-0 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
            >
              {error}
            </div>
          )}
          <StorefrontSection
            categories={categories}
            formData={formData}
            setFormData={setFormData}
            syncDisplayNameWithName
          />
          <ProductMediaSection
            formData={formData}
            setFormData={setFormData}
          />
          <SalesAvailabilitySection
            formData={formData}
            setFormData={setFormData}
          />
        </div>

        <FinishedProductCreateSummary
          categories={categories}
          formData={formData}
          isSaving={isSaving}
          onCancel={onCancel}
        />
      </form>
    );
  }

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
    >
      {error && (
        <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:px-5">
          {error}
        </div>
      )}

      {!hideNavigation && <div className="border-b border-neutral-200 bg-neutral-50/80 px-3 py-2.5 sm:px-4">
        <div
          className="inline-flex w-full flex-wrap gap-1 rounded-lg bg-neutral-100/80 p-1 sm:w-auto"
          role="tablist"
        >
          {productFormTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                activeTab === tab.id
                  ? "bg-white text-neutral-950 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900",
                tab.id === "basics" &&
                  basicsIncomplete &&
                  activeTab !== "basics" &&
                  "text-red-600",
              )}
            >
              {tab.label}
              {tab.id === "basics" && basicsIncomplete ? " *" : ""}
            </button>
          ))}
        </div>
      </div>}

      <div className="space-y-4 p-4 sm:p-5">
        {activeTab === "basics" && (
          <SalesInfoSection
            categories={categories}
            formData={formData}
            setFormData={setFormData}
          />
        )}

        {activeTab === "variants" && (
          <VariantSection
            formData={formData}
            {...variantEditor}
          />
        )}

        {activeTab === "operations" && (
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <OperationsSection formData={formData} setFormData={setFormData} />
            <div className="space-y-4">
              <LogisticsSection formData={formData} setFormData={setFormData} />
              <DisplayLabelsSection formData={formData} setFormData={setFormData} />
            </div>
          </div>
        )}

        {activeTab === "pricing" && (
          <div className="grid gap-4 md:grid-cols-2">
            <CostingSection
              formData={formData}
              setFormData={setFormData}
              productId={productId}
              costingSummary={costingSummary}
            />
            <MetadataSection
              formData={formData}
              setFormData={setFormData}
              assistantNote={assistantNote}
              onApplyAssistant={onApplyAssistant}
            />
          </div>
        )}
      </div>

      {!hideActions && <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          Cập nhật sản phẩm
        </button>
      </div>}
    </form>
  );
}

function FinishedProductCreateSummary({
  categories,
  formData,
  isSaving,
  onCancel,
}: {
  categories: Category[];
  formData: ProductFormData;
  isSaving: boolean;
  onCancel: () => void;
}) {
  const categoryName =
    categories.find((category) => category.id === formData.categoryId)?.name ??
    "";
  const checks = [
    { label: "Tên nội bộ", ready: Boolean(formData.name.trim()) },
    { label: "Tên hiển thị", ready: Boolean(formData.displayName.trim()) },
    { label: "Danh mục bán", ready: Boolean(categoryName) },
    { label: "Giá niêm yết", ready: formData.price > 0 },
    { label: "Ảnh đại diện", ready: Boolean(formData.imageUrl.trim()) },
  ];
  const isReady = checks.every((check) => check.ready);
  const skuPreview = createProductSkuPattern({
    itemType: "finished_good",
    name: formData.name,
  });

  return (
    <aside className="lg:sticky lg:top-5">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <PackageCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-neutral-950">
                Kiểm tra hồ sơ
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Thành phẩm bán ra cửa hàng
              </p>
            </div>
          </div>
        </div>

        <div className="border-b border-neutral-200 px-5 py-4">
          <p className="text-xs font-bold text-neutral-500">Mã dự kiến</p>
          <p className="mt-1 break-all font-mono text-sm font-bold text-neutral-900">
            {skuPreview}
          </p>
        </div>

        <div className="divide-y divide-neutral-100 px-5">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between gap-3 py-3"
            >
              <span className="text-sm font-semibold text-neutral-700">
                {check.label}
              </span>
              {check.ready ? (
                <Check
                  className="h-4 w-4 shrink-0 text-emerald-600"
                  aria-label="Đã hoàn thiện"
                />
              ) : (
                <CircleDashed
                  className="h-4 w-4 shrink-0 text-neutral-400"
                  aria-label="Chưa hoàn thiện"
                />
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4">
          <p className="text-xs font-bold text-neutral-500">Sau khi tạo</p>
          <p className="mt-1 text-sm font-bold leading-5 text-neutral-900">
            {formData.lifecycleStatus === "active" && formData.isAvailable
              ? "Được phép hiển thị trên cửa hàng"
              : "Lưu nội bộ, chưa hiển thị trên cửa hàng"}
          </p>
        </div>

        <div className="space-y-2 border-t border-neutral-200 p-4">
          <button
            type="submit"
            disabled={isSaving || !isReady}
            className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-[var(--color-accent-ink)] transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isSaving && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            {isSaving ? "Đang tạo…" : "Tạo thành phẩm"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Hủy
          </button>
        </div>
      </div>
    </aside>
  );
}
