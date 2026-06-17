"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout";
import { StickyCart } from "@/components/layout/StickyCart";
import { ProductCollection } from "@/features/home/components/ProductCollection";
import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import { useToast } from "@/hooks/useToast";
import { useCartStore } from "@/store";
import type { Product } from "@/types/product";

// Mock data - categories and products
const CATEGORIES = [
  { id: "1", name: "Bánh sinh nhật" },
  { id: "2", name: "Bánh mì ngọt" },
  { id: "3", name: "Bánh lạnh" },
  { id: "4", name: "Phụ kiện" },
  { id: "5", name: "Đồ uống" },
  { id: "6", name: "Bánh kem" },
  { id: "7", name: "Bánh quy" },
  { id: "8", name: "Bánh tart" },
];

const PRODUCTS_BY_CATEGORY: Record<string, Product[]> = {
  "1": [
    {
      id: "1",
      name: "Bánh Red Velvet",
      price: 250000,
      imageUrl: "https://loremflickr.com/150/150?lock=1",
      categoryId: "1",
      description: "Bánh Red Velvet thơm ngon với kem cheese",
      availableForDelivery: true,
      availableForPickup: true,
      sizeOptions: [
        { id: "16cm", label: "16cm", priceAdjustment: 0 },
        { id: "20cm", label: "20cm", priceAdjustment: 50000 },
        { id: "24cm", label: "24cm", priceAdjustment: 100000 },
      ],
      flavorOptions: [
        { id: "original", label: "Truyền thống" },
        { id: "cheese", label: "Cream cheese" },
        { id: "dark", label: "Dark chocolate" },
      ],
      requiresMessage: true,
    },
    {
      id: "2",
      name: "Bánh Chocolate",
      price: 200000,
      imageUrl: "https://loremflickr.com/150/150?lock=2",
      categoryId: "1",
      description: "Bánh chocolate đậm đà hương vị",
      availableForDelivery: true,
      availableForPickup: true,
      sizeOptions: [
        { id: "16cm", label: "16cm", priceAdjustment: 0 },
        { id: "20cm", label: "20cm", priceAdjustment: 50000 },
      ],
      flavorOptions: [
        { id: "milk", label: "Sô-cô-la sữa" },
        { id: "dark", label: "Sô-cô-la đen" },
      ],
      requiresMessage: true,
    },
    {
      id: "3",
      name: "Bánh Vanilla",
      price: 180000,
      imageUrl: "https://loremflickr.com/150/150?lock=3",
      categoryId: "1",
      description: "Bánh vanilla nhẹ nhàng thơm mát",
      availableForDelivery: true,
      availableForPickup: true,
      requiresMessage: true,
    },
  ],
  "2": [
    {
      id: "6",
      name: "Croissant Bơ",
      price: 45000,
      imageUrl: "https://loremflickr.com/150/150?lock=6",
      categoryId: "2",
      description: "Croissant bơ tươi giòn tan",
      availableForDelivery: true,
      availableForPickup: true,
    },
    {
      id: "7",
      name: "Bánh Mì Sandwich",
      price: 55000,
      imageUrl: "https://loremflickr.com/150/150?lock=7",
      categoryId: "2",
      description: "Bánh mì sandwich thịt nguội",
      availableForDelivery: true,
      availableForPickup: true,
    },
  ],
  "3": [
    {
      id: "4",
      name: "Bánh Tiramisu",
      price: 300000,
      imageUrl: "https://loremflickr.com/150/150?lock=4",
      categoryId: "3",
      description: "Bánh Tiramisu Ý nguyên bản",
      availableForDelivery: true,
      availableForPickup: true,
      sizeOptions: [
        { id: "small", label: "Nhỏ (4 người)", priceAdjustment: 0 },
        { id: "medium", label: "Vừa (6-8 người)", priceAdjustment: 80000 },
        { id: "large", label: "Lớn (10-12 người)", priceAdjustment: 150000 },
      ],
      flavorOptions: [
        { id: "classic", label: "Cổ điển" },
        { id: "mocha", label: "Mocha" },
      ],
    },
    {
      id: "5",
      name: "Bánh Opera",
      price: 320000,
      imageUrl: "https://loremflickr.com/150/150?lock=5",
      categoryId: "3",
      description: "Bánh Opera nhiều lớp tinh tế",
      availableForDelivery: true,
      availableForPickup: true,
    },
  ],
  "5": [
    {
      id: "8",
      name: "Matcha Latte",
      price: 65000,
      imageUrl: "https://loremflickr.com/150/150?lock=8",
      categoryId: "5",
      description: "Matcha latte đậm đà hương trà",
      availableForDelivery: true,
      availableForPickup: true,
    },
  ],
};

interface CategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { id } = await params;

  // Find category
  const category = CATEGORIES.find((cat) => cat.id === id);

  if (!category) {
    notFound();
  }

  // Get products for this category
  const products = PRODUCTS_BY_CATEGORY[id] || [];

  return <CategoryPageContent category={category} products={products} />;
}

function CategoryPageContent({
  category,
  products,
}: {
  category: { id: string; name: string };
  products: Product[];
}) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const addToCart = useCartStore((state) => state.addItem);
  const { showToast } = useToast();

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
      addToCart({
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
      <Header />

      <main className="min-h-screen pt-14 pb-20 bg-neutral-50">
        {/* Category Header */}
        <section className="px-4 pt-4 pb-6 border-b border-neutral-200">
          <h1 className="text-2xl font-bold text-neutral-900">
            {category.name}
          </h1>
          <p className="text-sm text-neutral-600 mt-2">
            {products.length} sản phẩm
          </p>
        </section>

        {/* Products */}
        {products.length > 0 ? (
          <section className="p-4">
            <ProductCollection
              title=""
              products={products}
              onAddToCart={handleProductClick}
            />
          </section>
        ) : (
          <section className="p-4">
            <div className="text-center py-12">
              <p className="text-neutral-600">
                Không có sản phẩm trong danh mục này
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={!!selectedProduct}
          onClose={handleCloseModal}
          onAddToCart={handleAddToCart}
        />
      )}

      <StickyCart />
    </>
  );
}
