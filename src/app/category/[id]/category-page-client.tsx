"use client";

import { useState } from "react";
import { Header } from "@/components/layout";
import { StickyCart } from "@/components/layout/StickyCart";
import { ProductCollection } from "@/features/home/components/ProductCollection";
import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import { useProductBuyNow } from "@/features/product/use-product-buy-now";
import {
  buildProductCartItem,
  type ProductCustomization,
} from "@/features/product/product-cart";
import { Toast } from "@/components/common";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store";
import type { Category, Product } from "@/types";

interface CategoryPageClientProps {
  category: Category;
  products: Product[];
}

export function CategoryPageClient({
  category,
  products,
}: CategoryPageClientProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const addToCart = useCartStore((state) => state.addItem);
  const { toast, showToast, hideToast } = useToast();
  const buyProductNow = useProductBuyNow();

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = (customization: ProductCustomization) => {
    if (!selectedProduct) return;

    try {
      addToCart(buildProductCartItem(selectedProduct, customization));

      handleCloseModal();
      showToast(`Đã thêm ${selectedProduct.name} vào giỏ hàng`, "success");
    } catch (error) {
      console.error("Failed to add product to cart:", error);
      showToast("Không thể thêm sản phẩm vào giỏ hàng", "error");
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen pt-14 pb-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <section className="px-4 lg:px-6 pt-4 pb-6 border-b border-neutral-200">
            <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900">
              {category.name}
            </h1>
            <p className="text-sm lg:text-base text-neutral-600 mt-2">
              {products.length} sản phẩm
            </p>
          </section>

          {products.length > 0 ? (
            <section className="p-4 lg:p-6">
              <ProductCollection
                title=""
                products={products}
                onAddToCart={handleProductClick}
              />
            </section>
          ) : (
            <section className="p-4 lg:p-6">
              <div className="text-center py-12">
                <p className="text-neutral-600">
                  Không có sản phẩm trong danh mục này
                </p>
              </div>
            </section>
          )}
        </div>
      </main>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={handleCloseModal}
          onAddToCart={handleAddToCart}
          onBuyNow={(customization) =>
            buyProductNow(selectedProduct, customization)
          }
        />
      )}

      <StickyCart />
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
