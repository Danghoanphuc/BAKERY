"use client";

import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { clsx } from "clsx";
import type { Category } from "@/types";
import type { ProductCostSummary } from "@/features/finance";
import type { ProductFormData } from "../_lib/product-form";
import {
  DisplayLabelsSection,
  FinanceCostSourceSection,
  FinancePerformanceSection,
  LogisticsIdentitySection,
  LogisticsInventorySection,
  LogisticsStorageSection,
  ProductContentSection,
  ProductMediaSection,
  ProductionProcessSection,
  ProductionBomEditor,
  ProductionScheduleSection,
  PublishingMetadataSection,
  SalesAvailabilitySection,
  StorefrontSection,
  VariantSection,
} from "./ProductFormSections";
import { useProductVariantEditor } from "./ProductForm";
import { ScrollStep } from "./ScrollStep";

export type ProductWorkspaceBlock =
  | "sales"
  | "production"
  | "finance"
  | "logistics";

type BlockTab = {
  id: string;
  label: string;
  status?: "incomplete" | "ready";
};

type ProductBlockSheetProps = {
  block: ProductWorkspaceBlock;
  productId: string;
  categories: Category[];
  formData: ProductFormData;
  error: string | null;
  costingSummary: ProductCostSummary | null;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCostingSummaryChange: () => Promise<void>;
};

export function getProductBlockFormId(block: ProductWorkspaceBlock) {
  return `product-block-${block}-form`;
}

export function ProductBlockSheet({
  block,
  productId,
  categories,
  formData,
  error,
  costingSummary,
  setFormData,
  onSubmit,
  onCostingSummaryChange,
}: ProductBlockSheetProps) {
  const [activeTab, setActiveTab] = useState(getBlockTabs(block, formData)[0]?.id ?? "main");
  const variantEditor = useProductVariantEditor(setFormData);
  const tabs = getBlockTabs(block, formData);

  return (
    <form id={getProductBlockFormId(block)} onSubmit={onSubmit} className="mx-auto w-full max-w-4xl px-5 pb-7 sm:px-7">
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      {tabs.length > 1 && (
        <div className="sticky top-0 z-20 -mx-5 mb-5 flex gap-1 overflow-x-auto border-b border-neutral-200 bg-[#fbfbfa]/95 px-5 pt-3 backdrop-blur sm:-mx-7 sm:px-7" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-bold transition",
                activeTab === tab.id
                  ? "border-neutral-950 text-neutral-950"
                  : "border-transparent text-neutral-400 hover:text-neutral-700",
              )}
              >
              {tab.label}
              {tab.status === "incomplete" && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" aria-label="Cần hoàn thiện" />}
              {tab.status === "ready" && <span className="ml-1.5 text-[10px] text-emerald-600">✓</span>}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {block === "sales" && activeTab === "storefront" && <><ScrollStep label="Thông tin cửa hàng"><StorefrontSection categories={categories} formData={formData} setFormData={setFormData} /></ScrollStep><ScrollStep label="Khả năng bán"><SalesAvailabilitySection formData={formData} setFormData={setFormData} /></ScrollStep></>}
        {block === "sales" && activeTab === "content" && <><ScrollStep label="Media"><ProductMediaSection formData={formData} setFormData={setFormData} /></ScrollStep><ScrollStep label="Nội dung"><ProductContentSection formData={formData} setFormData={setFormData} /></ScrollStep><ScrollStep label="Nhãn"><DisplayLabelsSection formData={formData} setFormData={setFormData} /></ScrollStep></>}
        {block === "sales" && activeTab === "variants" && <VariantSection formData={formData} {...variantEditor} />}
        {block === "sales" && activeTab === "publishing" && <PublishingMetadataSection formData={formData} setFormData={setFormData} />}

        {block === "production" && activeTab === "bom" && <ProductionBomEditor productId={productId} onActivated={onCostingSummaryChange} />}
        {block === "production" && activeTab === "schedule" && <><ScrollStep label="Công đoạn"><ProductionProcessSection formData={formData} setFormData={setFormData} /></ScrollStep><ScrollStep label="Thời gian & quy cách"><ProductionScheduleSection formData={formData} setFormData={setFormData} /></ScrollStep></>}

        {block === "finance" && activeTab === "performance" && <FinancePerformanceSection formData={formData} setFormData={setFormData} costingSummary={costingSummary} />}
        {block === "finance" && activeTab === "cost-source" && <FinanceCostSourceSection formData={formData} setFormData={setFormData} costingSummary={costingSummary} />}

        {block === "logistics" && activeTab === "inventory" && <LogisticsInventorySection productId={productId} legacyStock={formData.stock} />}
        {block === "logistics" && activeTab === "identity" && <LogisticsIdentitySection formData={formData} setFormData={setFormData} assignMissingVariantIdentifiers={variantEditor.assignMissingVariantIdentifiers} updateVariantCombination={variantEditor.updateVariantCombination} />}
        {block === "logistics" && activeTab === "storage" && <LogisticsStorageSection formData={formData} setFormData={setFormData} />}
      </div>

      <div className="h-8" />
    </form>
  );
}

function getBlockTabs(block: ProductWorkspaceBlock, formData: ProductFormData): BlockTab[] {
  if (block === "sales") return [
    { id: "storefront", label: "Cửa hàng", status: !formData.displayName.trim() || !formData.categoryId || formData.price <= 0 ? "incomplete" : "ready" },
    { id: "content", label: "Nội dung & media", status: !formData.imageUrl || !formData.description.trim() ? "incomplete" : "ready" },
    { id: "variants", label: "Biến thể", status: formData.sizeOptions.length + formData.flavorOptions.length > 0 ? "ready" : undefined },
    { id: "publishing", label: "Xuất bản" },
  ];
  if (block === "production") return [
    { id: "bom", label: "BOM" },
    { id: "schedule", label: "Quy trình", status: (formData.productionSteps?.length ?? 0) > 0 ? "ready" : undefined },
  ];
  if (block === "logistics") return [
    { id: "inventory", label: "Tồn & lịch sử" },
    { id: "identity", label: "Nhận diện" },
    { id: "storage", label: "Bảo quản" },
  ];
  if (block === "finance") return [
    { id: "performance", label: "Hiệu quả" },
    { id: "cost-source", label: "Nguồn giá vốn" },
  ];
  return [{ id: "main", label: "Tổng quan" }];
}
