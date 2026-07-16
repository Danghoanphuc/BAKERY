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

      <main className="brand-page pb-20 pt-8">
        <div className="max-w-7xl mx-auto">
          <section className="border-b border-sand px-4 pb-6 pt-4 lg:px-6">
            <p className="brand-eyebrow">Danh mục sản phẩm</p>
            <h1 className="brand-heading mt-1 text-2xl lg:text-3xl">
              {category.name}
            </h1>
            <p className="mt-2 text-sm text-text-muted lg:text-base">
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
