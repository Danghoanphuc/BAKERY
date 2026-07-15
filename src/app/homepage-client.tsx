"use client";

import { useState } from "react";
import { ProductCollection } from "@/features/home/components";
import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import { useProductBuyNow } from "@/features/product/use-product-buy-now";
import {
  buildProductCartItem,
  type ProductCustomization,
} from "@/features/product/product-cart";
import { useCartStore } from "@/store/cartStore";
import { Toast } from "@/components/common";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/types/product";

interface HomepageClientProps {
  title: string;
  products: Product[];
}

export function HomepageClient({ title, products }: HomepageClientProps) {
  const { addItem } = useCartStore();
  const { toast, showToast, hideToast } = useToast();
  const buyProductNow = useProductBuyNow();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = (customization: ProductCustomization) => {
    if (!selectedProduct) return;

    try {
      addItem(buildProductCartItem(selectedProduct, customization));

      // Close modal and show success toast
      handleCloseModal();
      showToast(`Đã thêm ${selectedProduct.name} vào giỏ hàng`, "success");
    } catch (error) {
      console.error("Failed to add product to cart:", error);
      showToast("Không thể thêm sản phẩm vào giỏ hàng", "error");
    }
  };

  return (
    <>
      <ProductCollection
        title={title}
        products={products}
        onAddToCart={handleProductClick}
      />

      {/* Product Detail Modal */}
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

      {/* Toast notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </>
  );
}
