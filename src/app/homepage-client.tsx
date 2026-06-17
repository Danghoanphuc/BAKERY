"use client";

import { useState } from "react";
import { ProductCollection } from "@/features/home/components";
import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
  };

  const handleAddToCart = (customization: {
    quantity: number;
    selectedSize?: string;
    selectedFlavor?: string;
    customMessage?: string;
    candles?: number;
  }) => {
    if (!selectedProduct) return;

    try {
      // Calculate final price with size adjustment
      let finalPrice = selectedProduct.price;
      if (customization.selectedSize && selectedProduct.sizeOptions) {
        const sizeOption = selectedProduct.sizeOptions.find(
          (s) => s.id === customization.selectedSize,
        );
        if (sizeOption) {
          finalPrice += sizeOption.priceAdjustment;
        }
      }

      // Add to cart with customization
      addItem({
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: customization.quantity,
        price: finalPrice,
        imageUrl: selectedProduct.imageUrl,
        selectedSize: customization.selectedSize,
        selectedFlavor: customization.selectedFlavor,
        customMessage: customization.customMessage,
        candles: customization.candles,
      });

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
