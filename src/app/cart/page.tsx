"use client";

import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/common";

export default function CartPage() {
  const router = useRouter();
  const {
    items,
    totalQuantity,
    totalPrice,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCartStore();

  const handleBack = () => {
    router.back();
  };

  const handleQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  if (totalQuantity === 0) {
    return (
      <main className="min-h-screen p-4 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Giỏ hàng trống</h1>
          <p className="text-neutral-600">
            Bạn chưa có sản phẩm nào trong giỏ hàng
          </p>
          <Button onClick={handleBack} variant="primary">
            Tiếp tục mua sắm
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center text-neutral-600 hover:text-neutral-900"
            aria-label="Quay lại"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="ml-2">Quay lại</span>
          </button>
          <h1 className="text-lg font-semibold">Giỏ hàng ({totalQuantity})</h1>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Xóa tất cả
          </button>
        </div>
      </header>

      {/* Cart Items */}
      <div className="p-4 space-y-4">
        {items.map((item) => (
          <div
            key={item.productId}
            className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200"
          >
            <div className="flex items-center space-x-4">
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                className="w-16 h-16 rounded-lg object-cover"
              />

              <div className="flex-1">
                <h3 className="font-medium text-neutral-900">
                  {item.product.name}
                </h3>
                <p className="text-sm text-neutral-600">
                  {formatPrice(item.price)}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    handleQuantityChange(item.productId, item.quantity - 1)
                  }
                  className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200"
                  aria-label="Giảm số lượng"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>

                <span className="w-8 text-center font-medium">
                  {item.quantity}
                </span>

                <button
                  onClick={() =>
                    handleQuantityChange(item.productId, item.quantity + 1)
                  }
                  className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200"
                  aria-label="Tăng số lượng"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => removeItem(item.productId)}
                className="text-red-500 hover:text-red-700 p-1"
                aria-label="Xóa sản phẩm"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Summary */}
      <div className="p-4 bg-white border-t border-neutral-200">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">Tổng cộng:</span>
            <span className="text-xl font-bold text-red-500">
              {formatPrice(totalPrice)}
            </span>
          </div>

          <Button variant="primary" className="w-full">
            Đặt hàng ({totalQuantity} món)
          </Button>
        </div>
      </div>
    </main>
  );
}
