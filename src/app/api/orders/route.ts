import { NextResponse } from "next/server";
import {
  createOrder,
  generateOrderNumber,
  getAllProducts,
  getOrdersByCustomer,
  getOrdersByPhone,
  updateOrder,
} from "@/lib/db";
import {
  CUSTOMER_SESSION_COOKIE,
  createCustomerSessionCookie,
  parseCustomerSessionValue,
  readCookie,
} from "@/lib/auth/customer-session";
import {
  createOrUpdateCustomerFromPurchase,
  getCustomerById,
  getMarketingCampaigns,
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
import {
  getPublicVouchers,
  getPublicVouchersFromCampaigns,
  getVoucherByCodeFromCampaigns,
} from "@/lib/vouchers";
import { validateVoucherRedemption } from "@/lib/voucher-redemption-policy";
import {
  createOrderPaymentLink,
  createPayOSOrderCode,
  isPayOSEnabled,
} from "@/lib/payos";

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

export async function GET(request: Request) {
  try {
    // Check authentication
    const cookieHeader = request.headers.get("cookie") || "";
    const sessionValue = readCookie(cookieHeader, CUSTOMER_SESSION_COOKIE);
    const session = parseCustomerSessionValue(sessionValue);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Please login to view orders" },
        { status: 401 },
      );
    }

    const [customerOrders, customer] = await Promise.all([
      getOrdersByCustomer(session.customerId),
      getCustomerById(session.customerId),
    ]);
    const phoneOrders = customer?.phone
      ? await getOrdersByPhone(customer.phone)
      : [];
    const ordersById = new Map<string, Order>();

    [...customerOrders, ...phoneOrders].forEach((order) => {
      ordersById.set(order.id, order);
    });

    const orders = Array.from(ordersById.values()).sort(
      (a, b) => getOrderTime(b.createdAt) - getOrderTime(a.createdAt),
    );

    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

function getOrderTime(value: unknown) {
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

export async function POST(request: Request) {
  try {
    const data = stripUndefinedDeep(await request.json()) as Partial<Order> & {
      customerBirthday?: string;
      customerGender?: "male" | "female" | "other";
    };
    const sessionValue = readCookie(
      request.headers.get("cookie"),
      CUSTOMER_SESSION_COOKIE,
    );
    const session = parseCustomerSessionValue(sessionValue);
    const orderNumber = generateOrderNumber();
    const [products, campaigns] = await Promise.all([
      getAllProducts(),
      getMarketingCampaigns(),
    ]);
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
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
    const requestedVoucher =
      data.voucherId || data.voucherCode
        ? data.voucherCode
          ? getVoucherByCodeFromCampaigns(data.voucherCode, campaigns)
          : [
              ...getPublicVouchers(),
              ...getPublicVouchersFromCampaigns(campaigns),
            ].find((voucher) => voucher.id === data.voucherId)
        : null;
    const voucherValidation = requestedVoucher
      ? await validateVoucherRedemption({
          voucher: requestedVoucher,
          subtotal: safeProductSubtotal,
          channel: data.voucherUseMode as VoucherUseChannel | undefined,
          customerId: session?.customerId ?? data.customerId,
          phone: data.customerPhone,
        })
      : null;

    if (requestedVoucher && voucherValidation && !voucherValidation.ok) {
      return NextResponse.json(
        { error: voucherValidation.error },
        { status: 409 },
      );
    }

    if ((data.discountAmount ?? 0) > 0 && !requestedVoucher) {
      return NextResponse.json(
        { error: "Voucher không hợp lệ hoặc đã hết hiệu lực." },
        { status: 400 },
      );
    }

    const serverDiscountAmount =
      voucherValidation?.ok ? voucherValidation.pricing.discountAmount : 0;
    const serverTotalAmount =
      Math.max(0, safeProductSubtotal - serverDiscountAmount) +
      (data.deliveryFee ?? 0);
    const netProductRevenue = Math.max(
      0,
      safeProductSubtotal - serverDiscountAmount,
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
      customerId: customer?.id ?? data.customerId,
      totalAmount: serverTotalAmount,
      status: "pending",
      paymentStatus:
        data.paymentMethod === "bank_transfer" ? "pending" : data.paymentStatus ?? "unpaid",
      paymentMethod: data.paymentMethod ?? "cod",
      payosOrderCode:
        data.paymentMethod === "bank_transfer" ? createPayOSOrderCode() : undefined,
      salesChannel: data.salesChannel ?? inferSalesChannel(draftOrder),
      productSubtotal: safeProductSubtotal,
      estimatedCostOfGoods,
      estimatedGrossProfit: netProductRevenue - estimatedCostOfGoods,
      loyaltyPointsEarned,
      discountAmount: serverDiscountAmount,
      voucherCode: requestedVoucher?.code,
      voucherId: requestedVoucher?.id,
    });
    const order = await createOrder(orderPayload);
    let payosPayment:
      | {
          checkoutUrl: string;
          qrCode: string;
          paymentLinkId: string;
          orderCode: number;
        }
      | undefined;

    if (order.paymentMethod === "bank_transfer") {
      if (!isPayOSEnabled()) {
        return NextResponse.json(
          { error: "PayOS chÆ°a Ä‘Æ°á»£c cáº¥u hĂ¬nh." },
          { status: 500 },
        );
      }

      const paymentLink = await createOrderPaymentLink({
        order,
        orderCode: order.payosOrderCode ?? createPayOSOrderCode(),
      });

      await updateOrder(order.id, {
        payosOrderCode: paymentLink.orderCode,
        payosPaymentLinkId: paymentLink.paymentLinkId,
        payosCheckoutUrl: paymentLink.checkoutUrl,
        payosQrCode: paymentLink.qrCode,
      });

      payosPayment = paymentLink;
    }
    const postOrderTasks: Array<Promise<void>> = [];

    if (requestedVoucher && serverDiscountAmount > 0) {
      postOrderTasks.push(
        recordVoucherRedemption({
          voucherId: requestedVoucher.id,
          voucherCode: requestedVoucher.code,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: customer?.id,
          phone: customer?.phone ?? data.customerPhone,
          channel: data.voucherUseMode as VoucherUseChannel | undefined,
          subtotal: safeProductSubtotal,
          discountAmount: serverDiscountAmount,
          totalAfterDiscount: serverTotalAmount,
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
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        payos: payosPayment,
        customerId: customer?.id,
        loyaltyPointsEarned,
      },
      { status: 201 },
    );

    if (customer) {
      response.headers.append(
        "Set-Cookie",
        createCustomerSessionCookie(customer.id),
      );
    }

    return response;
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 },
    );
  }
}
