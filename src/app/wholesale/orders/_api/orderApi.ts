import type { Order, OrderStatus } from "@/types";

export async function updateOrderApi(
  orderId: string,
  payload: Partial<Order>,
): Promise<Order> {
  const response = await fetch(`/api/wholesale/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (response.status === 409) {
    throw new Error("Không thể chuyển trạng thái theo luồng này.");
  }

  if (!response.ok) {
    let errorMessage = "Không thể cập nhật đơn hàng.";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Nếu không parse được JSON, dùng message mặc định
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function bulkUpdateOrderStatusApi(
  orderIds: string[],
  status: OrderStatus,
): Promise<{ total: number; financialSyncPending: number }> {
  const response = await fetch("/api/wholesale/orders/bulk", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderIds, status }),
  });

  const data = (await response.json()) as {
    error?: string;
    total?: number;
    financialSyncPending?: number;
  };
  if (!response.ok) {
    throw new Error(data.error || "Không thể cập nhật hàng loạt.");
  }

  return {
    total: data.total ?? orderIds.length,
    financialSyncPending: data.financialSyncPending ?? 0,
  };
}
