export function getCustomerOrderPath(orderId: string) {
  return `/order/${encodeURIComponent(orderId)}`;
}
