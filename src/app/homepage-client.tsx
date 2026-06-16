"use client";

import { ProductCollection } from "@/features/home/components";
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

  const handleAddToCart = (product: Product) => {
    try {
      addItem(product);

      // Show success toast notification
      showToast(`Đã thêm ${product.name} vào giỏ hàng`, "success");
    } catch (error) {
      console.error("Failed to add product to cart:", error);

      // Show error toast notification
      showToast("Không thể thêm sản phẩm vào giỏ hàng", "error");
    }
  };

  return (
    <>
      <ProductCollection
        title={title}
        products={products}
        onAddToCart={handleAddToCart}
      />

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
