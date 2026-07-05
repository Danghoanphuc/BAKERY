"use client";

import { Modal } from "@/components/common";
import { StatusBadge } from "../StatusBadge";
import type { Order } from "@/types";
import {
  Package,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
} from "lucide-react";

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
}: OrderDetailModalProps) {
  if (!order) return null;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return "N/A";

    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return "N/A";

      return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(dateObj);
    } catch {
      return "N/A";
    }
  };

  const orderTypeLabel = {
    delivery: "Giao hàng",
    pickup: "Đến lấy",
    preorder: "Đặt trước",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi tiết đơn hàng #${order.orderNumber}`}
    >
      <div className="space-y-6">
        {/* Order Status & Type */}
        <div className="flex items-center justify-between">
          <StatusBadge status={order.status} />
          <span className="text-sm text-neutral-600">
            {orderTypeLabel[order.orderType]}
          </span>
        </div>

        {/* Customer Info */}
        <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-neutral-900">
            Thông tin khách hàng
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-neutral-500" />
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-neutral-500" />
              <span>{order.customerPhone}</span>
            </div>
            {order.customerEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-neutral-500" />
                <span>{order.customerEmail}</span>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-neutral-500 mt-0.5" />
                <span>{order.deliveryAddress}</span>
              </div>
            )}
            {order.pickupTime && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-500" />
                <span>Lấy lúc: {formatDate(order.pickupTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Items */}
        <div>
          <h3 className="font-semibold text-neutral-900 mb-3">
            Chi tiết đơn hàng
          </h3>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div
                key={item.cartItemId}
                className="flex gap-4 p-4 border border-neutral-200 rounded-lg"
              >
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-neutral-900">
                    {item.productName}
                  </h4>

                  {/* Customization Details */}
                  {(item.selectedSize ||
                    item.selectedFlavor ||
                    item.customMessage ||
                    item.candles) && (
                    <div className="mt-2 space-y-1 text-sm text-neutral-600">
                      {item.selectedSize && (
                        <p>
                          🎂 Kích thước:{" "}
                          <span className="font-medium">
                            {item.selectedSize}
                          </span>
                        </p>
                      )}
                      {item.selectedFlavor && (
                        <p>
                          🍰 Hương vị:{" "}
                          <span className="font-medium">
                            {item.selectedFlavor}
                          </span>
                        </p>
                      )}
                      {item.customMessage && (
                        <p className="flex items-start gap-1">
                          <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span>
                            Lời chúc:{" "}
                            <span className="font-medium italic">
                              "{item.customMessage}"
                            </span>
                          </span>
                        </p>
                      )}
                      {item.candles && item.candles > 0 && (
                        <p>
                          🕯️ Số nến:{" "}
                          <span className="font-medium">{item.candles}</span>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-neutral-600">
                      Số lượng: {item.quantity}
                    </span>
                    <span className="font-semibold text-primary-600">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-900 mb-1">
              Ghi chú đơn hàng
            </h4>
            <p className="text-sm text-amber-800">{order.notes}</p>
          </div>
        )}

        {/* Total */}
        <div className="border-t border-neutral-200 pt-4">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Tổng cộng:</span>
            <span className="text-primary-600">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="text-xs text-neutral-500 space-y-1">
          <p>Đặt lúc: {formatDate(order.createdAt)}</p>
          <p>Cập nhật: {formatDate(order.updatedAt)}</p>
        </div>
      </div>
    </Modal>
  );
}
