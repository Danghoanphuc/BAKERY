import { NextResponse } from "next/server";
import {
  generateOrderNumber,
  getAllProducts,
  updateOrder,
} from "@/lib/wholesale-db";
import {
  createOrUpdateCustomerFromPurchase,
  getCustomerById,
  getMarketingCampaigns,
  getMarketingSettings,
} from "@/lib/wholesale-firebase";
import {
  getOrderProductSubtotal,
} from "@/lib/finance";
import {
  getPublicVouchers,
  getPublicVouchersFromCampaigns,
  getVoucherByCodeFromCampaigns,
} from "@/lib/vouchers";
import { validateVoucherRedemption } from "@/lib/wholesale-voucher-redemption-policy";
import type { CartItem, Order, Product } from "@/types";
import type { PaymentMethod } from "@/types/finance";
import type { VoucherUseChannel } from "@/types";
import {
  createOrderPaymentLink,
  createPayOSOrderCode,
  isPayOSEnabled,
} from "@/lib/payos";
import {
  buildItemFinancialSnapshots,
  getStandardCostCatalog,
} from "@/features/wholesale-finance";
import { requireAdmin } from "@/lib/auth/require-admin";
import { fulfillPaidPosOrder } from "@/lib/wholesale-pos-order-fulfillment";
import { createReservedPosOrderOnce } from "@/lib/wholesale-firebase/pos-inventory";

type PosCheckoutPayload = {
  idempotencyKey?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items?: Array<Partial<CartItem>>;
  voucherCode?: string;
  voucherId?: string;
  paymentMethod?: PaymentMethod;
  cashReceived?: number;
  note?: string;
  posServiceType?: "counter" | "takeaway" | "table";
  tableId?: string;
  tableName?: string;
};

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

function getRepricedCartItem(
  item: Partial<CartItem>,
  productById: Map<string, Product>,
) {
  if (!item.productId || !item.quantity || item.quantity < 1) {
    throw new Error("INVALID_ITEM");
  }

  const product = productById.get(item.productId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  if (product.isAvailable === false || product.availableForPickup === false) {
    throw new Error("PRODUCT_UNAVAILABLE");
  }
  if (product.availableToday === false || product.requiresPreorder) {
    throw new Error("PRODUCT_NOT_READY");
  }
  if (typeof product.stock === "number" && product.stock < item.quantity) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  const sizeAdjustment =
    product.sizeOptions?.find((size) => size.id === item.selectedSize)
      ?.priceAdjustment ?? 0;

  return {
    productId: product.id,
    productName: product.name,
    imageUrl: product.imageUrl,
    selectedSize: item.selectedSize,
    selectedFlavor: item.selectedFlavor,
    customMessage: item.customMessage,
    candles: item.candles,
    price: product.price + sizeAdjustment,
    quantity: item.quantity,
  } satisfies Omit<CartItem, "cartItemId">;
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  try {
    const payload = (await request.json()) as PosCheckoutPayload;
    const idempotencyKey = payload.idempotencyKey?.trim();
    if (!idempotencyKey || !/^[a-zA-Z0-9_-]{16,80}$/.test(idempotencyKey)) {
      return NextResponse.json(
        { error: "Yêu cầu thanh toán không có khóa chống trùng hợp lệ." },
        { status: 400 },
      );
    }
    const rawItems = payload.items ?? [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Giỏ hàng đang trống." },
        { status: 400 },
      );
    }

    const [products, campaigns, costCatalog] = await Promise.all([
      getAllProducts(),
      getMarketingCampaigns(),
      getStandardCostCatalog(),
    ]);
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const items = rawItems.map((item) =>
      getRepricedCartItem(item, productById),
    );
    const draftOrder = {
      items,
      productSubtotal: items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
    } as Order;
    const productSubtotal = getOrderProductSubtotal(draftOrder);
    const requestedVoucher =
      payload.voucherId || payload.voucherCode
        ? payload.voucherCode
          ? getVoucherByCodeFromCampaigns(payload.voucherCode, campaigns)
          : [
              ...getPublicVouchers(),
              ...getPublicVouchersFromCampaigns(campaigns),
            ].find((voucher) => voucher.id === payload.voucherId)
        : null;

    if (requestedVoucher?.requiresPhone && !payload.customerPhone?.trim()) {
      return NextResponse.json(
        { error: "Voucher này cần số điện thoại khách hàng." },
        { status: 400 },
      );
    }

    const voucherValidation = requestedVoucher
      ? await validateVoucherRedemption({
          voucher: requestedVoucher,
          subtotal: productSubtotal,
          channel: "pos_pickup_now" as VoucherUseChannel,
          phone: payload.customerPhone,
        })
      : null;

    if (requestedVoucher && voucherValidation && !voucherValidation.ok) {
      return NextResponse.json(
        { error: voucherValidation.error },
        { status: 409 },
      );
    }

    const discountAmount = voucherValidation?.ok
      ? voucherValidation.pricing.discountAmount
      : 0;
    const totalAmount = Math.max(0, productSubtotal - discountAmount);
    const selectedCustomer = payload.customerId
      ? await getCustomerById(payload.customerId)
      : null;
    const customer =
      selectedCustomer ??
      (payload.customerPhone?.trim() || payload.customerName?.trim()
        ? await createOrUpdateCustomerFromPurchase({
            name: payload.customerName?.trim() || "Khách lẻ",
            phone: payload.customerPhone?.trim() || "0000000000",
            status: "active",
            loyaltyPoints: 0,
            personalization: {},
          })
        : null);
    const marketingSettings = await getMarketingSettings();
    const loyaltyPointsEarned =
      customer && totalAmount > 0
        ? Math.max(
            1,
            Math.floor(
              totalAmount / Math.max(1, marketingSettings.pointsPerAmount),
            ),
          )
        : 0;

    const itemFinancialSnapshots = buildItemFinancialSnapshots({
      items,
      discountAmount,
      products,
      recipes: costCatalog.recipes,
      ingredients: costCatalog.ingredients,
    });
    const estimatedCostOfGoods = itemFinancialSnapshots.reduce(
      (sum, item) => sum + item.totalCost,
      0,
    );
    const paymentMethod = payload.paymentMethod ?? "cash";
    const isBankTransfer = paymentMethod === "bank_transfer";
    const cashReceived = paymentMethod === "cash"
      ? Math.max(0, Math.floor(Number(payload.cashReceived) || 0))
      : undefined;
    if (paymentMethod === "cash" && (cashReceived ?? 0) < totalAmount) {
      return NextResponse.json(
        { error: "Số tiền khách đưa chưa đủ." },
        { status: 400 },
      );
    }

    if (isBankTransfer && !isPayOSEnabled()) {
      return NextResponse.json(
        { error: "PayOS chưa được cấu hình. Không thể tạo mã QR thanh toán." },
        { status: 500 },
      );
    }

    const isPayOSPayment = isBankTransfer;
    const orderPayload: Omit<Order, "id" | "createdAt" | "updatedAt" | "items"> & {
      items: Array<Omit<CartItem, "cartItemId">>;
    } = stripUndefinedDeep({
      orderNumber: generateOrderNumber(),
      customerId: customer?.id,
      customerName:
        customer?.name ?? payload.customerName?.trim() ?? "Khách lẻ",
      customerPhone:
        customer?.phone ?? payload.customerPhone?.trim() ?? "0000000000",
      items,
      productSubtotal,
      discountAmount,
      totalAmount,
      orderType: "pickup",
      salesChannel: "pos",
      posServiceType: payload.posServiceType ?? "counter",
      tableId:
        payload.posServiceType === "table" ? payload.tableId?.trim() : undefined,
      tableName:
        payload.posServiceType === "table" ? payload.tableName?.trim() : undefined,
      voucherUseMode: requestedVoucher ? "pos_pickup_now" : undefined,
      voucherCode: requestedVoucher?.code,
      voucherId: requestedVoucher?.id,
      status: isBankTransfer ? "pending" : "completed",
      paymentStatus: isBankTransfer ? "pending" : "paid",
      paymentMethod,
      cashReceived,
      changeDue:
        paymentMethod === "cash" ? (cashReceived ?? 0) - totalAmount : undefined,
      payosOrderCode: isPayOSPayment ? createPayOSOrderCode() : undefined,
      estimatedCostOfGoods,
      itemFinancialSnapshots,
      estimatedGrossProfit: totalAmount - estimatedCostOfGoods,
      loyaltyPointsEarned,
      statusHistory: [
        {
          status: isBankTransfer ? "pending" : "completed",
          at: new Date().toISOString(),
          actor: "pos",
          note: isBankTransfer ? "Chờ chuyển khoản" : "Thanh toán POS",
        },
      ],
      note: payload.note?.trim() || undefined,
    });

    const { order, created } = await createReservedPosOrderOnce(
      idempotencyKey,
      orderPayload,
    );
    let payosPayment:
      | {
          checkoutUrl: string;
          qrCode: string;
          paymentLinkId: string;
          orderCode: number;
        }
      | undefined;

    if (isPayOSPayment && created) {
      try {
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
      } catch (payosError) {
        console.error("POS PayOS payment link failed:", payosError);
        await updateOrder(order.id, {
          status: "cancelled",
          paymentStatus: "unpaid",
          cancelReason: "Không tạo được mã QR PayOS",
        });
        return NextResponse.json(
          { error: "Không thể tạo mã QR thanh toán. Vui lòng thử lại." },
          { status: 502 },
        );
      }
    }

    if (isPayOSPayment && !created) {
      payosPayment = order.payosCheckoutUrl && order.payosQrCode && order.payosPaymentLinkId && order.payosOrderCode
        ? {
            checkoutUrl: order.payosCheckoutUrl,
            qrCode: order.payosQrCode,
            paymentLinkId: order.payosPaymentLinkId,
            orderCode: order.payosOrderCode,
          }
        : undefined;
    }

    if (!isBankTransfer) {
      await fulfillPaidPosOrder(
        { ...order, createdAt: new Date(), updatedAt: new Date() },
        "pos",
      );
    }

    return NextResponse.json(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount,
        discountAmount,
        loyaltyPointsEarned,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        payos: payosPayment,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POS checkout failed:", error);
    const message =
      error instanceof Error && error.message === "INSUFFICIENT_STOCK"
        ? "Một hoặc nhiều sản phẩm không đủ tồn kho."
        : "Không thể hoàn tất thanh toán POS.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
