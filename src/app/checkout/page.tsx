"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/common";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();
  const { config } = useOrderConfigStore();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Wait for client-side hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && items.length === 0) {
      router.push("/cart");
    }
  }, [isClient, items, router]);

  if (!isClient) {
    return (
      <main className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-neutral-600">Đang tải...</p>
      </main>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const deliveryAddressString = config.deliveryAddress
        ? `${config.deliveryAddress.street}, ${config.deliveryAddress.district}, ${config.deliveryAddress.city}`
        : undefined;

      const pickupTimeDate =
        config.orderTiming.type === "scheduled" &&
        config.orderTiming.scheduledDate &&
        config.orderTiming.scheduledTime
          ? new Date(
              `${config.orderTiming.scheduledDate}T${config.orderTiming.scheduledTime}`,
            )
          : undefined;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.name,
          customerPhone: formData.phone,
          customerEmail: formData.email || undefined,
          totalAmount: totalPrice,
          orderType: config.deliveryMode,
          deliveryAddress: deliveryAddressString,
          pickupTime: pickupTimeDate,
          notes: formData.notes || undefined,
          items: items,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      const order = await res.json();
      clearCart();
      router.push(`/order-success?orderNumber=${order.orderNumber}`);
    } catch (err) {
      console.error(err);
      setError("Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 p-4 lg:py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center text-neutral-600 hover:text-neutral-900"
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
          <h1 className="text-lg lg:text-xl font-semibold">Thanh toán</h1>
          <div></div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto lg:grid lg:grid-cols-3 lg:gap-8 lg:p-6">
        <div className="lg:col-span-2 p-4 lg:p-0 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-semibold mb-4">
                Thông tin khách hàng
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Họ tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-200">
              <h2 className="text-lg font-semibold mb-4">Ghi chú</h2>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Ghi chú cho đơn hàng..."
              />
            </div>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="p-4 lg:p-6 bg-white border-t lg:border lg:rounded-lg border-neutral-200 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold mb-4">Đơn hàng</h2>
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex items-start gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-neutral-900">
                      {item.productName} x{item.quantity}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {item.selectedSize && `Kích thước: ${item.selectedSize}`}
                      {item.selectedFlavor && ` • Vị: ${item.selectedFlavor}`}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-neutral-900">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Tạm tính:</span>
                <span className="font-medium">{formatPrice(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Phí vận chuyển:</span>
                <span className="font-medium">Miễn phí</span>
              </div>
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Tổng cộng:</span>
                  <span className="text-xl font-bold text-red-500">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full py-3 mt-4"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Đang xử lý..." : "Đặt hàng ngay"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
