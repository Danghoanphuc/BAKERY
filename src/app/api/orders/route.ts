import { NextResponse } from "next/server";
import { getOrders, createOrder, generateOrderNumber, getAllProducts } from "@/lib/db";
import { createCustomerSessionCookie } from "@/lib/auth/customer-session";
import {
  createOrUpdateCustomerFromPurchase,
  getMarketingSettings,
  recordVoucherRedemption,
} from "@/lib/firebase";
import {
  estimateOrderCostOfGoods,
  getOrderProductSubtotal,
  inferSalesChannel,
} from "@/lib/finance";
import type { Order } from "@/types";
import type { VoucherUseChannel } from "@/types";

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    if (value instanceof Date) return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, stripUndefinedDeep(item)]),
    ) as T;
  }

  return value;
}

function serializeForJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item));
  }

  if (value && typeof value === "object") {
    if ("toDate" in value && typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime())
        ? date.toISOString()
        : null;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        serializeForJson(item),
      ]),
    );
  }

  return value;
}

export async function GET() {
  try {
    const orders = await getOrders();
    return NextResponse.json(serializeForJson(orders));
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const data = stripUndefinedDeep(await request.json()) as Partial<Order> & {
      customerBirthday?: string;
      customerGender?: "male" | "female" | "other";
    };
    const orderNumber = generateOrderNumber();
    const products = await getAllProducts();
    const productById = new Map(products.map((product) => [product.id, product]));
    const draftOrder = {
      ...data,
      orderNumber,
      status: "pending",
      paymentStatus: data.paymentStatus ?? "unpaid",
    } as Order;
    const productSubtotal = getOrderProductSubtotal(draftOrder);
    const estimatedCostOfGoods = estimateOrderCostOfGoods(
      draftOrder,
      productById,
    );
    const fallbackProductSubtotal = Math.max(
      0,
      (data.totalAmount ?? 0) -
        (data.deliveryFee ?? 0) +
        (data.discountAmount ?? 0),
    );
    const safeProductSubtotal =
      productSubtotal > 0 ? productSubtotal : fallbackProductSubtotal;
    const netProductRevenue = Math.max(
      0,
      safeProductSubtotal - (data.discountAmount ?? 0),
    );
    const marketingSettings = await getMarketingSettings();
    const rawLoyaltyPoints = Math.floor(
      netProductRevenue / Math.max(1, marketingSettings.pointsPerAmount),
    );
    const loyaltyPointsEarned =
      netProductRevenue > 0 ? Math.max(1, rawLoyaltyPoints) : 0;
    const customer =
      data.customerName && data.customerPhone
        ? await createOrUpdateCustomerFromPurchase({
            name: data.customerName,
            phone: data.customerPhone,
            email: data.customerEmail,
            birthday: data.customerBirthday,
            gender: data.customerGender,
            status: "active",
            loyaltyPoints: loyaltyPointsEarned,
            personalization: {},
          })
        : null;
    const orderPayload = stripUndefinedDeep({
      ...data,
      orderNumber,
      status: "pending",
      paymentStatus: data.paymentStatus ?? "unpaid",
      paymentMethod: data.paymentMethod,
      salesChannel: data.salesChannel ?? inferSalesChannel(draftOrder),
      productSubtotal: safeProductSubtotal,
      estimatedCostOfGoods,
      estimatedGrossProfit: netProductRevenue - estimatedCostOfGoods,
      loyaltyPointsEarned,
    });
    const order = await createOrder(orderPayload);
    const postOrderTasks: Array<Promise<void>> = [];

    if ((data.voucherId || data.voucherCode) && (data.discountAmount ?? 0) > 0) {
      postOrderTasks.push(
        recordVoucherRedemption({
          voucherId: data.voucherId,
          voucherCode: data.voucherCode,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: customer?.id,
          phone: customer?.phone ?? data.customerPhone,
          channel: data.voucherUseMode as VoucherUseChannel | undefined,
          subtotal: safeProductSubtotal,
          discountAmount: data.discountAmount ?? 0,
          totalAfterDiscount: Math.max(0, data.totalAmount ?? 0),
          source: "checkout",
        }),
      );
    }

    if (postOrderTasks.length > 0) {
      const syncResults = await Promise.allSettled(postOrderTasks);
      syncResults.forEach((result) => {
        if (result.status === "rejected") {
          console.error("Post-order sync failed:", result.reason);
        }
      });
    }

    const response = NextResponse.json(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        customerId: customer?.id,
        loyaltyPointsEarned,
      },
      { status: 201 },
    );

    if (customer) {
      response.headers.append("Set-Cookie", createCustomerSessionCookie(customer.id));
    }

    return response;
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
