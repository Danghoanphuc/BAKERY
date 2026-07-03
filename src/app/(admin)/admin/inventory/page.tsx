"use client";

import { useEffect, useState } from "react";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import type { Product, Category, SizeOption, FlavorOption } from "@/types";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    imageUrl: "",
    categoryId: "",
    description: "",
    availableForDelivery: true,
    availableForPickup: true,
    requiresMessage: false,
    isFeatured: false,
    isNew: false,
    isBestseller: false,
    stock: 0,
    isAvailable: true,
    sizeOptions: [] as SizeOption[],
    flavorOptions: [] as FlavorOption[],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);
      const productsData = await productsRes.json();
      const categoriesData = await categoriesRes.json();
      setProducts(productsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Không thể tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Hết hàng", color: "text-red-600" };
    if (stock < 10) return { label: "Sắp hết", color: "text-orange-600" };
    return { label: "Còn hàng", color: "text-green-600" };
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      price: 0,
      imageUrl: "",
      categoryId: categories[0]?.id || "",
      description: "",
      availableForDelivery: true,
      availableForPickup: true,
      requiresMessage: false,
      isFeatured: false,
      isNew: false,
      isBestseller: false,
      stock: 0,
      isAvailable: true,
      sizeOptions: [],
      flavorOptions: [],
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      categoryId: product.categoryId ?? "",
      description: product.description || "",
      availableForDelivery: product.availableForDelivery ?? true,
      availableForPickup: product.availableForPickup ?? true,
      requiresMessage: product.requiresMessage ?? false,
      isFeatured: product.isFeatured ?? false,
      isNew: product.isNew ?? false,
      isBestseller: product.isBestseller ?? false,
      stock: product.stock ?? 0,
      isAvailable: product.isAvailable ?? true,
      sizeOptions: product.sizeOptions || [],
      flavorOptions: product.flavorOptions || [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await fetch(`/api/products/${editingProduct.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Failed to save product:", err);
      setError("Không thể lưu sản phẩm");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    console.log("Attempting to delete product with ID:", productId);
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      console.log("Delete response status:", res.status);
      if (!res.ok) {
        const text = await res.text();
        console.error("Delete response text:", text);
        try {
          const errData = JSON.parse(text);
          console.error("Delete error data:", errData);
          setError(
            `Không thể xóa sản phẩm: ${errData.error} - ${errData.details || errData.stack || ""}`,
          );
        } catch (parseErr) {
          console.error("Failed to parse error JSON:", parseErr);
          setError(`Không thể xóa sản phẩm: ${text}`);
        }
        return;
      }
      setError(null);
      loadData();
    } catch (err) {
      console.error("Failed to delete product:", err);
      setError(`Không thể xóa sản phẩm: ${(err as Error).message}`);
    }
  };

  const handleToggleAvailability = async (product: Product) => {
    try {
      await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !product.isAvailable }),
      });
      loadData();
    } catch (err) {
      console.error("Failed to update availability:", err);
      setError("Không thể cập nhật trạng thái");
    }
  };

  const addSizeOption = () => {
    setFormData((prev) => ({
      ...prev,
      sizeOptions: [
        ...prev.sizeOptions,
        { id: Date.now().toString(), label: "", priceAdjustment: 0 },
      ],
    }));
  };

  const updateSizeOption = (
    index: number,
    field: keyof SizeOption,
    value: any,
  ) => {
    setFormData((prev) => {
      const newSizes = [...prev.sizeOptions];
      newSizes[index] = { ...newSizes[index], [field]: value };
      return { ...prev, sizeOptions: newSizes };
    });
  };

  const removeSizeOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      sizeOptions: prev.sizeOptions.filter((_, i) => i !== index),
    }));
  };

  const addFlavorOption = () => {
    setFormData((prev) => ({
      ...prev,
      flavorOptions: [
        ...prev.flavorOptions,
        { id: Date.now().toString(), label: "" },
      ],
    }));
  };

  const updateFlavorOption = (index: number, label: string) => {
    setFormData((prev) => {
      const newFlavors = [...prev.flavorOptions];
      newFlavors[index] = { ...newFlavors[index], label };
      return { ...prev, flavorOptions: newFlavors };
    });
  };

  const removeFlavorOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      flavorOptions: prev.flavorOptions.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Quản lý kho & sản phẩm
          </h1>
          <p className="text-neutral-600 mt-1">
            Danh sách sản phẩm và quản lý tồn kho
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (confirm("Bạn có chắc muốn xóa TẤT CẢ sản phẩm?")) {
                try {
                  const res = await fetch("/api/products/clear", {
                    method: "DELETE",
                  });
                  const data = await res.json();
                  console.log("Deleted all products:", data);
                  loadData();
                } catch (e) {
                  console.error(e);
                  setError("Lỗi xóa tất cả sản phẩm");
                }
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Xóa tất cả
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Sản phẩm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Giá cơ bản
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Tồn kho
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {isLoading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-neutral-500"
                  >
                    Đang tải dữ liệu kho...
                  </td>
                </tr>
              )}

              {!isLoading &&
                products.map((product) => {
                  const stockStatus = getStockStatus(product.stock || 0);
                  const category = categories.find(
                    (c) => c.id === product.categoryId,
                  );

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-neutral-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              {product.name}
                            </div>
                            <div className="text-xs text-neutral-500">
                              ID: {product.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-neutral-900">
                          {category?.name || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-neutral-900">
                          {formatPrice(product.price)}
                        </div>
                        {product.sizeOptions &&
                          product.sizeOptions.length > 0 && (
                            <div className="text-xs text-neutral-500 mt-1">
                              {product.sizeOptions.length} kích thước
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-neutral-900">
                          {product.stock || 0} sản phẩm
                        </div>
                        <div
                          className={clsx(
                            "text-xs font-medium",
                            stockStatus.color,
                          )}
                        >
                          {stockStatus.label}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAvailability(product)}
                          className={clsx(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                            product.isAvailable
                              ? "bg-green-500"
                              : "bg-neutral-300",
                          )}
                          role="switch"
                          aria-checked={product.isAvailable}
                        >
                          <span
                            className={clsx(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              product.isAvailable
                                ? "translate-x-6"
                                : "translate-x-1",
                            )}
                          />
                        </button>
                        <div className="text-xs text-neutral-500 mt-1">
                          {product.isAvailable ? "Đang bán" : "Ngừng bán"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm"
                          >
                            <Edit2 className="w-4 h-4" />
                            Chỉnh sửa
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && products.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-sm text-neutral-500"
                  >
                    Chưa có sản phẩm nào trong database
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="text-sm text-neutral-600 mb-1">Tổng sản phẩm</div>
          <div className="text-2xl font-bold text-neutral-900">
            {products.length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="text-sm text-neutral-600 mb-1">Đang bán</div>
          <div className="text-2xl font-bold text-green-600">
            {products.filter((p) => p.isAvailable).length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-neutral-200 p-6">
          <div className="text-sm text-neutral-600 mb-1">Sắp hết hàng</div>
          <div className="text-2xl font-bold text-orange-600">
            {
              products.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) < 10)
                .length
            }
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-900">
                {editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tên sản phẩm *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Giá (VND) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tồn kho *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    URL ảnh *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Danh mục *
                  </label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isAvailable: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span className="text-sm text-neutral-700">Đang bán</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isFeatured: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span className="text-sm text-neutral-700">Nổi bật</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isNew}
                    onChange={(e) =>
                      setFormData({ ...formData, isNew: e.target.checked })
                    }
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span className="text-sm text-neutral-700">Mới</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isBestseller}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isBestseller: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span className="text-sm text-neutral-700">Bán chạy</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.availableForDelivery}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        availableForDelivery: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span className="text-sm text-neutral-700">
                    Có thể giao hàng
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.availableForPickup}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        availableForPickup: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span className="text-sm text-neutral-700">
                    Có thể đến lấy
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requiresMessage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requiresMessage: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-brand-600 rounded"
                  />
                  <span className="text-sm text-neutral-700">
                    Yêu cầu tin nhắn tùy chỉnh
                  </span>
                </label>
              </div>

              {/* Size Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Kích thước
                  </label>
                  <button
                    type="button"
                    onClick={addSizeOption}
                    className="text-sm text-brand-600 hover:text-brand-700"
                  >
                    + Thêm kích thước
                  </button>
                </div>
                {formData.sizeOptions.map((size, index) => (
                  <div key={size.id} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Tên kích thước (vd: 16cm)"
                      value={size.label}
                      onChange={(e) =>
                        updateSizeOption(index, "label", e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    <input
                      type="number"
                      placeholder="Giá thêm"
                      value={size.priceAdjustment}
                      onChange={(e) =>
                        updateSizeOption(
                          index,
                          "priceAdjustment",
                          Number(e.target.value),
                        )
                      }
                      className="w-32 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeSizeOption(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Flavor Options */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Vị
                  </label>
                  <button
                    type="button"
                    onClick={addFlavorOption}
                    className="text-sm text-brand-600 hover:text-brand-700"
                  >
                    + Thêm vị
                  </button>
                </div>
                {formData.flavorOptions.map((flavor, index) => (
                  <div key={flavor.id} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Tên vị (vd: Socola)"
                      value={flavor.label}
                      onChange={(e) =>
                        updateFlavorOption(index, e.target.value)
                      }
                      className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeFlavorOption(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-700 border border-neutral-300 rounded-lg hover:bg-neutral-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
                >
                  {editingProduct ? "Cập nhật" : "Thêm sản phẩm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
