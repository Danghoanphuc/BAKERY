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

  const handleQuantityChange = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(cartItemId);
    } else {
      updateQuantity(cartItemId, newQuantity);
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
      <header className="bg-white border-b border-neutral-200 p-4 lg:py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
          <h1 className="text-lg lg:text-xl font-semibold">
            Giỏ hàng ({totalQuantity})
          </h1>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-700 text-sm lg:text-base"
          >
            Xóa tất cả
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-3 lg:gap-8 lg:p-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 p-4 lg:p-0 space-y-4">
          {items.map((item) => (
            <div
              key={item.cartItemId}
              className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200"
            >
              <div className="flex items-start space-x-4">
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-neutral-900">
                    {item.productName}
                  </h3>

                  {/* Customization details */}
                  {(item.selectedSize ||
                    item.selectedFlavor ||
                    item.customMessage ||
                    item.candles) && (
                    <div className="mt-1 space-y-1">
                      {item.selectedSize && (
                        <p className="text-xs text-neutral-600">
                          Kích thước: {item.selectedSize}
                        </p>
                      )}
                      {item.selectedFlavor && (
                        <p className="text-xs text-neutral-600">
                          Hương vị: {item.selectedFlavor}
                        </p>
                      )}
                      {item.customMessage && (
                        <p className="text-xs text-neutral-600">
                          Lời chúc: {item.customMessage}
                        </p>
                      )}
                      {item.candles && item.candles > 0 && (
                        <p className="text-xs text-neutral-600">
                          Số nến: {item.candles}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-neutral-900 font-medium mt-2">
                    {formatPrice(item.price)}
                  </p>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        handleQuantityChange(item.cartItemId, item.quantity - 1)
                      }
                      className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200"
                      aria-label="Giảm số lượng"
                    >
                      <svg
                        className="w-3 h-3"
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

                    <span className="w-6 text-center font-medium text-sm">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() =>
                        handleQuantityChange(item.cartItemId, item.quantity + 1)
                      }
                      className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200"
                      aria-label="Tăng số lượng"
                    >
                      <svg
                        className="w-3 h-3"
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
                    onClick={() => removeItem(item.cartItemId)}
                    className="text-red-500 hover:text-red-700 p-1"
                    aria-label="Xóa sản phẩm"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary - Sticky on Desktop */}
        <div className="lg:col-span-1">
          <div className="p-4 lg:p-6 bg-white border-t lg:border lg:rounded-lg border-neutral-200 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold mb-4 hidden lg:block">
              Tóm tắt đơn hàng
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm lg:text-base">
                <span className="text-neutral-600">Tạm tính:</span>
                <span className="font-medium">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center text-sm lg:text-base">
                <span className="text-neutral-600">Phí vận chuyển:</span>
                <span className="font-medium">Miễn phí</span>
              </div>
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Tổng cộng:</span>
                  <span className="text-xl lg:text-2xl font-bold text-red-500">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full py-3 lg:py-4 text-base lg:text-lg"
                onClick={() => router.push('/checkout')}
              >
                Đặt hàng ({totalQuantity} món)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
