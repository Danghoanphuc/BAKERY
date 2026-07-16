"use client";

import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";
import type { Category, FlavorOption, ProductVariantCombination, SizeOption } from "@/types";
import type { ProductCostSummary } from "@/features/finance";
import { createInternalBarcode, createProductSku, createVariantSku } from "@/lib/product-identifiers";
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

      {!hideNavigation && mode !== "create" && <div className="border-b border-neutral-200 bg-neutral-50/80 px-3 py-2.5 sm:px-4">
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
        {mode === "create" ? <><div className="rounded-xl border border-brand-100 bg-brand-50/50 px-4 py-3"><p className="font-bold text-neutral-900">Khởi tạo sản phẩm từ thông tin bán hàng</p><p className="mt-1 text-sm text-neutral-600">Điền tên, danh mục, giá và ảnh đại diện. Các khối Sản xuất, Tài chính, Kho vận sẽ được thiết lập sau khi tạo.</p></div><StorefrontSection categories={categories} formData={formData} setFormData={setFormData} /><ProductMediaSection formData={formData} setFormData={setFormData} /><SalesAvailabilitySection formData={formData} setFormData={setFormData} /></> : activeTab === "basics" && (
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
          {mode === "edit" ? "Cập nhật sản phẩm" : "Tạo sản phẩm"}
        </button>
      </div>}
    </form>
  );
}
