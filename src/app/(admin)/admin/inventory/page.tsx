"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Category, Product } from "@/types";
import { InventoryStats } from "./_components/InventoryStats";
import { InventoryTable } from "./_components/InventoryTable";
import { ProductFormModal } from "./_components/ProductFormModal";
import {
  applyProductAssistant,
  buildCategoryNameMap,
  filterProducts,
  getInventoryStats,
} from "./_lib/inventory-utils";
import {
  createEmptyProductForm,
  ProductFilter,
  ProductFormData,
  productFormToPayload,
  productToForm,
} from "./_lib/product-form";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assistantNote, setAssistantNote] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ProductFilter>("all");
  const [formData, setFormData] = useState<ProductFormData>(
    createEmptyProductForm(),
  );

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory({ showLoading = true }: { showLoading?: boolean } = {}) {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }),
      ]);

      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error("Cannot load inventory data");
      }

      setProducts((await productsRes.json()) as Product[]);
      setCategories((await categoriesRes.json()) as Category[]);
      setError(null);
    } catch (err) {
      console.error("Failed to load inventory:", err);
      setError("Không thể tải dữ liệu kho. Vui lòng thử lại sau.");
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }

  const categoryNameById = useMemo(
    () => buildCategoryNameMap(categories),
    [categories],
  );
  const stats = useMemo(() => getInventoryStats(products), [products]);
  const filteredProducts = useMemo(
    () => filterProducts(products, categoryNameById, searchTerm, filter),
    [categoryNameById, filter, products, searchTerm],
  );

  const openAddModal = () => {
    setEditingProduct(null);
    setAssistantNote(null);
    setFormData(createEmptyProductForm(categories[0]?.id ?? ""));
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setAssistantNote(null);
    setFormData(productToForm(product, categories[0]?.id ?? ""));
    setIsModalOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    if (!formData.imageUrl.trim()) {
      setIsSaving(false);
      setError("Vui lòng tải lên ít nhất một ảnh sản phẩm.");
      return;
    }

    try {
      const response = await fetch(
        editingProduct ? `/api/products/${editingProduct.id}` : "/api/products",
        {
          method: editingProduct ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productFormToPayload(formData)),
        },
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const savedProduct = (await response.json()) as Product;
      setProducts((currentProducts) => {
        if (editingProduct) {
          return currentProducts.map((product) =>
            product.id === savedProduct.id ? savedProduct : product,
          );
        }

        return [savedProduct, ...currentProducts];
      });
      setIsModalOpen(false);
      void loadInventory({ showLoading: false });
    } catch (err) {
      console.error("Failed to save product:", err);
      setError("Không thể lưu sản phẩm. Kiểm tra lại thông tin rồi thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!confirm(`Xóa sản phẩm "${product.name}"?`)) return;

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      await loadInventory();
    } catch (err) {
      console.error("Failed to delete product:", err);
      setError("Không thể xóa sản phẩm này.");
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    const nextIsAvailable = !product.isAvailable;
    setSavingProductId(product.id);
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id
          ? { ...currentProduct, isAvailable: nextIsAvailable }
          : currentProduct,
      ),
    );

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: nextIsAvailable }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const savedProduct = (await response.json()) as Product;
      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === savedProduct.id ? savedProduct : currentProduct,
        ),
      );
    } catch (err) {
      console.error("Failed to update product availability:", err);
      setProducts((currentProducts) =>
        currentProducts.map((currentProduct) =>
          currentProduct.id === product.id ? product : currentProduct,
        ),
      );
      setError("Không thể cập nhật trạng thái bán.");
    } finally {
      setSavingProductId(null);
    }
  };

  const applyAssistant = () => {
    const categoryName = categoryNameById.get(formData.categoryId) ?? "";
    setFormData((currentForm) => applyProductAssistant(currentForm, categoryName));
    setAssistantNote(
      "Đã gợi ý tag, dịp sử dụng, dị ứng và từ khóa tìm kiếm từ tên/mô tả sản phẩm. Đây là trợ lý nội bộ, có thể nâng cấp sang AI thật khi cấu hình API.",
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-950">
            Quản lý kho & sản phẩm
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Theo dõi tồn kho, giá bán, kênh giao/lấy tại quán và dữ liệu phục vụ
            search/filter.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" />
          Thêm sản phẩm
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <InventoryStats
        totalProducts={products.length}
        sellingProducts={stats.selling}
        lowStockProducts={stats.lowStock}
        inventoryValue={stats.inventoryValue}
      />

      <InventoryTable
        products={filteredProducts}
        isLoading={isLoading}
        searchTerm={searchTerm}
        filter={filter}
        categoryNameById={categoryNameById}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilter}
        onEdit={openEditModal}
        onDelete={deleteProduct}
        onToggleAvailability={toggleProductAvailability}
        savingProductId={savingProductId}
      />

      {isModalOpen && (
        <ProductFormModal
          categories={categories}
          editingProduct={editingProduct}
          formData={formData}
          assistantNote={assistantNote}
          isSaving={isSaving}
          setFormData={setFormData}
          onClose={() => setIsModalOpen(false)}
          onSubmit={saveProduct}
          onApplyAssistant={applyAssistant}
        />
      )}
    </div>
  );
}
