import { NextResponse } from "next/server";
import { getAllCustomers, getAllOrders } from "@/lib/firebase";

function normalizeQuery(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

function getDateTime(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return value.seconds * 1000;
  }
  return 0;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const normalizedQuery = normalizeQuery(query);

    if (normalizedQuery.length < 2) {
      return NextResponse.json({ customers: [] });
    }

    const [customers, orders] = await Promise.all([
      getAllCustomers(),
      getAllOrders(500),
    ]);
    const ordersByCustomer = new Map<
      string,
      { totalOrders: number; lastOrderAt?: string }
    >();

    for (const order of orders) {
      const keys = [order.customerId, order.customerPhone]
        .filter(Boolean)
        .map((value) => String(value));

      for (const key of keys) {
        const current = ordersByCustomer.get(key) ?? { totalOrders: 0 };
        const orderTime = getDateTime(order.createdAt);
        const currentTime = getDateTime(current.lastOrderAt);
        ordersByCustomer.set(key, {
          totalOrders: current.totalOrders + 1,
          lastOrderAt:
            orderTime > currentTime
              ? new Date(orderTime).toISOString()
              : current.lastOrderAt,
        });
      }
    }

    const results = customers
      .filter((customer) => {
        const haystack = [
          customer.name,
          customer.phone,
          customer.email,
          ...(customer.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        const compactPhone = customer.phone.replace(/\s+/g, "");

        return (
          haystack.includes(query.trim().toLowerCase()) ||
          compactPhone.includes(normalizedQuery)
        );
      })
      .slice(0, 8)
      .map((customer) => {
        const orderSummary =
          ordersByCustomer.get(customer.id) ??
          ordersByCustomer.get(customer.phone) ??
          { totalOrders: 0 };

        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          tier: customer.tier,
          loyaltyPoints: customer.loyaltyPoints,
          totalOrders: orderSummary.totalOrders,
          lastOrderAt: orderSummary.lastOrderAt ?? customer.lastOrderAt,
        };
      });

    return NextResponse.json({ customers: results });
  } catch (error) {
    console.error("POS customer search failed:", error);
    return NextResponse.json(
      { error: "Không thể tìm khách hàng." },
      { status: 500 },
    );
  }
}
