import type { Order, OrderStatus } from "@/types";

export async function updateOrderApi(
  orderId: string,
  payload: Partial<Order>,
): Promise<Order> {
  const response = await fetch(`/api/admin/orders/${orderId}`, {
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
  orders: Order[],
  status: OrderStatus,
): Promise<{ failed: number; total: number }> {
  const targets = orders.filter((order) => orderIds.includes(order.id));

  const results = await Promise.allSettled(
    targets.map((order) =>
      fetch(`/api/admin/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    ),
  );

  const failed = results.filter(
    (result) => result.status === "rejected" || !result.value.ok,
  ).length;

  return { failed, total: targets.length };
}
