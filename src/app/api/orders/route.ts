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
  getCustomerByPhone,
  getMarketingCampaigns,
  getMarketingSettings,
  recordVoucherRedemption,
  updateCustomer,
} from "@/lib/firebase";
import {
  getOrderProductSubtotal,
  inferSalesChannel,
} from "@/lib/finance";
import {
  buildItemFinancialSnapshots,
  captureOrderFinancials,
  getStandardCostCatalog,
} from "@/features/finance";
import { expireUnpaidBankTransferOrder } from "@/lib/payment-expiry";
import type { Order } from "@/types";
import type { OrderConfig, CustomerAddressBookEntry } from "@/types";
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
import { buildRiskContext } from "@/lib/security/risk-context";
import {
  consumeSecurityAction,
  createSecurityLimitResponse,
  recordSecurityEvent,
} from "@/lib/security/security-events";
import {
  createChallengeRequiredResponse,
  passAdaptiveChallenge,
} from "@/lib/security/adaptive-challenge";

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
    const session = await parseCustomerSessionValue(sessionValue);

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

    const orders = (await Promise.all(
      Array.from(ordersById.values()).map((order) =>
        expireUnpaidBankTransferOrder(order),
      ),
    )).sort(
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
      deliveryAddressDetails?: OrderConfig["deliveryAddress"];
      securityChallengeToken?: string;
    };
    const securityChallengeToken = data.securityChallengeToken;
    delete data.securityChallengeToken;
    const sessionValue = readCookie(
      request.headers.get("cookie"),
      CUSTOMER_SESSION_COOKIE,
    );
    const session = await parseCustomerSessionValue(sessionValue);
    const riskContext = buildRiskContext(request, {
      sessionId: session?.sessionId,
      customerId: session?.customerId ?? data.customerId,
      phone: data.customerPhone,
      address: data.deliveryAddress,
    });
    const orderLimit = await consumeSecurityAction(
      "order_attempt",
      riskContext,
      [
        { subject: "visitor", max: 8, windowMs: 60 * 60_000 },
        { subject: "phone", max: 5, windowMs: 60 * 60_000 },
        { subject: "network", max: 30, windowMs: 60 * 60_000 },
      ],
    );
    if (!orderLimit.allowed) {
      const passed = await passAdaptiveChallenge(
        request,
        riskContext,
        securityChallengeToken,
        "create_order",
      );
      if (!passed) {
        return securityChallengeToken
          ? createSecurityLimitResponse(orderLimit)
          : createChallengeRequiredResponse("create_order");
      }
    }
    const orderNumber = generateOrderNumber();
    const [products, campaigns, costCatalog] = await Promise.all([
      getAllProducts(),
      getMarketingCampaigns(),
      getStandardCostCatalog(),
    ]);
    const draftOrder = {
      ...data,
      orderNumber,
      status: "pending",
      paymentStatus: data.paymentStatus ?? "unpaid",
    } as Order;
    const productSubtotal = getOrderProductSubtotal(draftOrder);
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
    const itemFinancialSnapshots = buildItemFinancialSnapshots({
      items: data.items ?? [],
      discountAmount: serverDiscountAmount,
      products,
      recipes: costCatalog.recipes,
      ingredients: costCatalog.ingredients,
    });
    const estimatedCostOfGoods = itemFinancialSnapshots.reduce(
      (sum, item) => sum + item.totalCost,
      0,
    );
    const marketingSettings = await getMarketingSettings();
    const rawLoyaltyPoints = Math.floor(
      netProductRevenue / Math.max(1, marketingSettings.pointsPerAmount),
    );
    const loyaltyPointsEarned =
      netProductRevenue > 0 ? Math.max(1, rawLoyaltyPoints) : 0;
    if (data.paymentMethod === "bank_transfer" && !isPayOSEnabled()) {
      return NextResponse.json(
        { error: "PayOS chưa được cấu hình. Vui lòng chọn phương thức khác." },
        { status: 503 },
      );
    }

    const existingCustomer = data.customerPhone
      ? await getCustomerByPhone(data.customerPhone)
      : null;

    if (data.paymentMethod !== "bank_transfer" && data.customerPhone) {
      const existingOrders = await getOrdersByPhone(data.customerPhone);
      const activeCodOrders = existingOrders.filter(
        (order) =>
          order.paymentMethod !== "bank_transfer" &&
          order.paymentStatus !== "paid" &&
          !["completed", "delivered", "cancelled"].includes(order.status),
      );
      if (activeCodOrders.length >= 2) {
        return NextResponse.json(
          {
            error: "Bạn đang có 2 đơn thanh toán khi nhận hàng chưa hoàn tất. Vui lòng hoàn tất đơn cũ hoặc chọn chuyển khoản.",
            code: "cod_limit_reached",
          },
          { status: 409 },
        );
      }
    }
    const isGuestCheckout = !session;

    if (isGuestCheckout && existingCustomer?.hasPassword) {
      return NextResponse.json(
        {
          error: "Số điện thoại này đã có tài khoản. Vui lòng đăng nhập trước khi đặt hàng.",
          code: "account_exists",
        },
        { status: 409 },
      );
    }

    if (
      requestedVoucher &&
      voucherValidation?.ok &&
      Math.max(0, requestedVoucher.maxUsesPerPhone ?? 1) <= 1
    ) {
      const voucherClusterLimit = await consumeSecurityAction(
        `voucher_claim:${requestedVoucher.id}`,
        riskContext,
        [
          { subject: "visitor", max: 1, windowMs: 30 * 24 * 60 * 60_000 },
          { subject: "address", max: 2, windowMs: 30 * 24 * 60 * 60_000 },
          { subject: "network", max: 5, windowMs: 30 * 24 * 60 * 60_000 },
        ],
        { voucherId: requestedVoucher.id },
      );
      if (!voucherClusterLimit.allowed) {
        return NextResponse.json(
          {
            error: "Ưu đãi này đã được sử dụng bởi tài khoản hoặc địa chỉ liên quan.",
            code: "voucher_cluster_limit",
          },
          { status: 409 },
        );
      }
    }

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
    const guestSessionCookie =
      customer && !session
        ? await createCustomerSessionCookie(customer.id, request, {
            authLevel: "guest",
          })
        : null;
    const selectedAddress = data.deliveryAddressDetails;
    if (
      customer &&
      selectedAddress?.formattedAddress &&
      !(customer.personalization.addressBook?.length) &&
      !customer.personalization.defaultDeliveryAddress
    ) {
      const now = new Date().toISOString();
      const addressEntry: CustomerAddressBookEntry = {
        id: crypto.randomUUID(),
        label: "Nhà",
        street: selectedAddress.street,
        district: selectedAddress.district,
        city: selectedAddress.city,
        formattedAddress: selectedAddress.formattedAddress,
        lat: selectedAddress.lat,
        lng: selectedAddress.lng,
        placeId: selectedAddress.placeId,
        isDefault: true,
        createdAt: now,
        updatedAt: now,
      };
      await updateCustomer(customer.id, {
        personalization: {
          ...customer.personalization,
          defaultDeliveryAddress: selectedAddress.formattedAddress,
          addressBook: [addressEntry],
        },
      });
    }
    const orderPayload = stripUndefinedDeep({
      ...data,
      deliveryAddressDetails: undefined,
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
      itemFinancialSnapshots,
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
    postOrderTasks.push(
      recordSecurityEvent("order_created", riskContext, {
        paymentMethod: order.paymentMethod ?? "cod",
        hasVoucher: Boolean(requestedVoucher),
      }),
    );
    if (order.paymentMethod !== "bank_transfer") {
      postOrderTasks.push(recordSecurityEvent("cod_order_created", riskContext));
    }
    postOrderTasks.push(
      captureOrderFinancials(
        { ...order, createdAt: new Date(), updatedAt: new Date() },
        customer?.id ? `customer:${customer.id}` : "guest-checkout",
      ),
    );

    if (requestedVoucher && serverDiscountAmount > 0) {
      postOrderTasks.push(
        recordSecurityEvent("voucher_redeemed", riskContext, {
          voucherId: requestedVoucher.id,
        }),
      );
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

    if (guestSessionCookie) {
      response.headers.append(
        "Set-Cookie",
        guestSessionCookie,
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
