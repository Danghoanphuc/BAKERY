import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, Printer, UserCheck, X } from "lucide-react";
import type {
  Order,
  OrderStatus,
  PaymentStatus,
  OrderStatusHistoryItem,
} from "@/types";
import { StatusBadge } from "@/features/admin/components/StatusBadge";
import { formatDateTime, formatPrice } from "../_lib/order-utils";
import {
  orderTypeLabel,
  statusFlow,
  terminalStatuses,
  labelForStatus,
} from "../_lib/constants";

type OrderDetailModalProps = {
  order: Order;
  onClose: () => void;
  onUpdate: (order: Order, payload: Partial<Order>) => Promise<void>;
  onPrint: (order: Order) => void;
  isSaving: boolean;
};

export function OrderDetailModal({
  order,
  onClose,
  onUpdate,
  onPrint,
  isSaving,
}: OrderDetailModalProps) {
  const [internalNotes, setInternalNotes] = useState(order.internalNotes ?? "");
  const [assignedTo, setAssignedTo] = useState(order.assignedTo ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    order.paymentStatus ?? "unpaid",
  );
  const [cancelReason, setCancelReason] = useState(order.cancelReason ?? "");

  async function saveOperations(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onUpdate(order, {
      internalNotes,
      assignedTo,
      paymentStatus,
      cancelReason,
    });
  }

  async function changeStatus(status: OrderStatus) {
    await onUpdate(order, {
      status,
      cancelReason: status === "cancelled" ? cancelReason : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white p-5">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              Đơn hàng {order.orderNumber}
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              {order.customerName} · {formatDateTime(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrint(order)}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              <Printer className="h-4 w-4" />
              In phiếu
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <section className="rounded-lg border border-neutral-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-neutral-900">Luồng xử lý</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Chỉ hiển thị các bước tiếp theo hợp lệ.
                  </p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {statusFlow[order.status].map((status) => (
                  <button
                    key={status}
                    onClick={() => changeStatus(status)}
                    disabled={isSaving}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
                      status === "cancelled"
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-neutral-900 text-white hover:bg-neutral-800"
                    }`}
                  >
                    {labelForStatus(status)}
                  </button>
                ))}
                {terminalStatuses.has(order.status) && (
                  <span className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-500">
                    Đơn đã kết thúc
                  </span>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">Sản phẩm</h3>
              <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-100">
                {order.items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex items-center gap-4 p-3"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-neutral-900">
                        {item.productName}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {[
                          item.selectedSize && `Size: ${item.selectedSize}`,
                          item.selectedFlavor && `Vị: ${item.selectedFlavor}`,
                          item.customMessage &&
                            `Tin nhắn: ${item.customMessage}`,
                          item.candles ? `${item.candles} nến` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-neutral-900">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                      <div className="text-sm text-neutral-500">
                        x{item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">Timeline</h3>
              <Timeline
                items={order.statusHistory ?? []}
                currentStatus={order.status}
              />
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">
                Thông tin khách
              </h3>
              <InfoLine label="Khách hàng" value={order.customerName} />
              <InfoLine label="Điện thoại" value={order.customerPhone} />
              {order.customerEmail && (
                <InfoLine label="Email" value={order.customerEmail} />
              )}
              <InfoLine
                label="Loại đơn"
                value={orderTypeLabel[order.orderType]}
              />
              {order.deliveryAddress && (
                <InfoLine label="Địa chỉ" value={order.deliveryAddress} />
              )}
              {order.pickupTime && (
                <InfoLine
                  label="Giờ hẹn"
                  value={formatDateTime(order.pickupTime)}
                />
              )}
              {order.notes && (
                <InfoLine label="Ghi chú khách" value={order.notes} />
              )}
            </section>

            <form
              onSubmit={saveOperations}
              className="space-y-3 rounded-lg border border-neutral-200 p-4"
            >
              <h3 className="font-bold text-neutral-900">Vận hành nội bộ</h3>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Nhân viên phụ trách
                </span>
                <input
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
                  placeholder="VD: Bếp A, shipper Minh"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Thanh toán
                </span>
                <select
                  value={paymentStatus}
                  onChange={(event) =>
                    setPaymentStatus(event.target.value as PaymentStatus)
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500"
                >
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="pending">Chờ chuyển khoản</option>
                  <option value="paid">Đã thanh toán</option>
                  <option value="refunded">Đã hoàn tiền</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Ghi chú nội bộ
                </span>
                <textarea
                  value={internalNotes}
                  onChange={(event) => setInternalNotes(event.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-neutral-600">
                  Lý do hủy nếu có
                </span>
                <textarea
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500"
                />
              </label>
              <button
                type="submit"
                disabled={isSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
                Lưu vận hành
              </button>
            </form>

            <section className="rounded-lg border border-neutral-200 p-4">
              <h3 className="mb-3 font-bold text-neutral-900">Tổng kết</h3>
              <InfoLine
                label="Tạm tính"
                value={formatPrice(
                  order.totalAmount - (order.deliveryFee || 0),
                )}
              />
              {order.deliveryFee && order.deliveryFee > 0 && (
                <InfoLine
                  label="Phí giao hàng"
                  value={formatPrice(order.deliveryFee)}
                />
              )}
              {order.discountAmount && order.discountAmount > 0 && (
                <InfoLine
                  label="Giảm giá"
                  value={formatPrice(order.discountAmount)}
                />
              )}
              <div className="my-2 border-t border-neutral-200" />
              <InfoLine
                label="Tổng cộng"
                value={formatPrice(order.totalAmount)}
                strong
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Timeline({
  items,
  currentStatus,
}: {
  items: OrderStatusHistoryItem[];
  currentStatus: OrderStatus;
}) {
  const history = items.length
    ? items
    : [
        {
          status: currentStatus,
          at: new Date().toISOString(),
          actor: "system",
        },
      ];

  return (
    <div className="space-y-3">
      {history.map((item, index) => (
        <div key={`${item.status}-${item.at}-${index}`} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-brand-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            {index < history.length - 1 && (
              <div className="mt-1 h-8 w-px bg-neutral-200" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-900">
              {labelForStatus(item.status)}
            </div>
            <div className="text-xs text-neutral-500">
              {formatDateTime(item.at)} · {item.actor ?? "system"}
            </div>
            {item.note && (
              <div className="mt-1 text-xs text-neutral-600">{item.note}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span
        className={`text-right ${
          strong
            ? "text-base font-bold text-neutral-900"
            : "font-medium text-neutral-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
