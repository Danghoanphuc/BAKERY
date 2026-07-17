"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Category, Product } from "@/types";
import type { ProductCostSummary } from "@/features/finance";
import { findCategoryForProduct } from "@/lib/product-category";
import { applyProductAssistant } from "../_lib/inventory-utils";
import {
  createEmptyProductForm,
  productFormToPayload,
  productToForm,
  type ProductFormData,
} from "../_lib/product-form";
import { ProductForm } from "./ProductForm";
import { ProductWorkspace } from "./ProductWorkspace";

type CostingSummaryResponse = {
  byProductId: Record<string, ProductCostSummary>;
};

type ProductEditorProps = {
  mode: "create" | "edit";
  productId?: string;
};

export function ProductEditor({ mode, productId }: ProductEditorProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [costingSummary, setCostingSummary] = useState<ProductCostSummary | null>(
    null,
  );
  const [formData, setFormData] = useState<ProductFormData>(
    createEmptyProductForm(),
  );
  const [productName, setProductName] = useState<string | null>(null);
  const [assistantNote, setAssistantNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [basicsIncomplete, setBasicsIncomplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        setIsLoading(true);
        setError(null);

        const [categoriesRes, costingRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/admin/finance/costing-summary", { cache: "no-store" }),
        ]);

        if (!categoriesRes.ok) {
          throw new Error("Không thể tải danh mục.");
        }

        const nextCategories = (await categoriesRes.json()) as Category[];
        if (cancelled) return;
        setCategories(nextCategories);

        let costingByProductId: Record<string, ProductCostSummary> = {};
        if (costingRes.ok) {
          const costing = (await costingRes.json()) as CostingSummaryResponse;
          costingByProductId = costing.byProductId ?? {};
        }

        if (mode === "edit" && productId) {
          const productRes = await fetch(`/api/products/${productId}`, {
            cache: "no-store",
          });
          if (!productRes.ok) {
            throw new Error("Không tìm thấy sản phẩm.");
          }
          const product = (await productRes.json()) as Product;
          if (cancelled) return;
          setProductName(product.name);
          setFormData(productToForm(product, nextCategories[0]?.id ?? ""));
          setCostingSummary(costingByProductId[product.id] ?? null);
        } else {
          if (cancelled) return;
          setProductName(null);
          setFormData(createEmptyProductForm());
          setCostingSummary(null);
        }
      } catch (loadError) {
        console.error("Failed to load product editor:", loadError);
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải trang sản phẩm.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();
    return () => {
      cancelled = true;
    };
  }, [mode, productId]);

  const goBack = () => {
    router.push("/admin/inventory");
  };

  const saveProduct = async () => {
    setIsSaving(true);
    setError(null);

    const missingBasics =
      !formData.name.trim() ||
      !formData.displayName.trim() ||
      !formData.categoryId.trim() ||
      !formData.imageUrl.trim() ||
      formData.price <= 0;

    if (missingBasics) {
      setBasicsIncomplete(true);
      setIsSaving(false);
      setError(
        !formData.imageUrl.trim()
          ? "Vui lòng tải lên ít nhất một ảnh sản phẩm."
          : formData.price <= 0
            ? "Vui lòng thiết lập giá niêm yết lớn hơn 0."
            : "Vui lòng điền đủ tên nội bộ, tên hiển thị, danh mục và ảnh để khởi tạo sản phẩm.",
      );
      return;
    }

    setBasicsIncomplete(false);

    try {
      const response = await fetch(
        mode === "edit" && productId
          ? `/api/products/${productId}`
          : "/api/products",
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productFormToPayload(formData)),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      toast.success(mode === "edit" ? "Đã cập nhật sản phẩm." : "Đã thêm sản phẩm mới.");
      router.push("/admin/inventory");
      router.refresh();
    } catch (saveError) {
      console.error("Failed to save product:", saveError);
      toast.error("Không thể lưu sản phẩm. Kiểm tra lại thông tin rồi thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveProduct();
  };

  const applyAssistant = () => {
    const categoryName =
      findCategoryForProduct({ categoryId: formData.categoryId }, categories)
        ?.name ?? "";
    setFormData((currentForm) => applyProductAssistant(currentForm, categoryName));
    setAssistantNote(
      "Đã gợi ý tag, dịp sử dụng, dị ứng và từ khóa tìm kiếm từ tên/mô tả sản phẩm. Đây là trợ lý nội bộ, có thể nâng cấp sang AI thật khi cấu hình API.",
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-neutral-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang tải...
      </div>
    );
  }

  const loadFailed =
    Boolean(error) &&
    (categories.length === 0 || (mode === "edit" && !productName));

  if (mode === "edit" && productId) {
    return loadFailed ? (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    ) : (
      <ProductWorkspace
        productId={productId}
        categories={categories}
        formData={formData}
        error={error}
        costingSummary={costingSummary}
        isSaving={isSaving}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        onSave={saveProduct}
        onBack={goBack}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 transition hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại kho
          </Link>
          <h1 className="mt-2 text-xl font-bold text-neutral-950 sm:text-2xl">
            {mode === "edit" ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"}
          </h1>
          <p className="mt-0.5 max-w-xl text-sm text-neutral-600">
            {mode === "edit" && productName
              ? productName
              : "Giá bán, tồn kho, kênh bán và metadata cho trang khách hàng."}
          </p>
        </div>
      </div>

      {loadFailed ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : (
        <ProductForm
          mode={mode}
          productId={productId}
          categories={categories}
          formData={formData}
          assistantNote={assistantNote}
          error={error}
          costingSummary={costingSummary}
          isSaving={isSaving}
          basicsIncomplete={basicsIncomplete}
          setFormData={setFormData}
          onCancel={goBack}
          onSubmit={handleSubmit}
          onApplyAssistant={applyAssistant}
        />
      )}
    </div>
  );
}
