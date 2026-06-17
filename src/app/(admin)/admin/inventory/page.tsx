"use client";

import { useState } from "react";
import { Edit2, Package } from "lucide-react";
import {
  mockInventoryProducts,
  type InventoryProduct,
} from "@/lib/mock-admin-data";
import { clsx } from "clsx";

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>(
    mockInventoryProducts,
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handleToggleAvailability = (productId: string) => {
    setProducts((prevProducts) =>
      prevProducts.map((product) =>
        product.id === productId
          ? { ...product, isAvailable: !product.isAvailable }
          : product,
      ),
    );
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: "Hết hàng", color: "text-red-600" };
    if (stock < 10) return { label: "Sắp hết", color: "text-orange-600" };
    return { label: "Còn hàng", color: "text-green-600" };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Quản lý kho & sản phẩm
          </h1>
          <p className="text-neutral-600 mt-1">
            Danh sách sản phẩm và quản lý tồn kho
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Package className="w-4 h-4" />
          Thêm sản phẩm mới
        </button>
      </div>

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
              {products.map((product) => {
                const stockStatus = getStockStatus(product.stock);

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
                        {product.category}
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
                        {product.stock} sản phẩm
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
                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleToggleAvailability(product.id)}
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
                      <button className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm">
                        <Edit2 className="w-4 h-4" />
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                );
              })}
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
            {products.filter((p) => p.stock > 0 && p.stock < 10).length}
          </div>
        </div>
      </div>
    </div>
  );
}
