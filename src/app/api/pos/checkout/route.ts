import { NextResponse } from "next/server";
import {
  createOrder,
  generateOrderNumber,
  getAllProducts,
  updateOrder,
  updateProduct,
} from "@/lib/db";
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
} from "@/lib/finance";
import {
  getPublicVouchers,
  getPublicVouchersFromCampaigns,
  getVoucherByCodeFromCampaigns,
} from "@/lib/vouchers";
import { validateVoucherRedemption } from "@/lib/voucher-redemption-policy";
import type { CartItem, Order, Product } from "@/types";
import type { PaymentMethod } from "@/types/finance";
import type { VoucherUseChannel } from "@/types";
import {
  createOrderPaymentLink,
  createPayOSOrderCode,
  isPayOSEnabled,
} from "@/lib/payos";

type PosCheckoutPayload = {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items?: Array<Partial<CartItem>>;
  voucherCode?: string;
  voucherId?: string;
  paymentMethod?: PaymentMethod;
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

async function decrementStock(
  items: Array<Omit<CartItem, "cartItemId">>,
  products: Product[],
) {
  const quantityByProductId = new Map<string, number>();

  for (const item of items) {
    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) ?? 0) + item.quantity,
    );
  }

  await Promise.all(
    [...quantityByProductId.entries()].map(async ([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      if (typeof product?.stock !== "number") return;

      await updateProduct(productId, {
        stock: Math.max(0, product.stock - quantity),
      });
    }),
  );
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PosCheckoutPayload;
    const rawItems = payload.items ?? [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Giỏ hàng đang trống." },
        { status: 400 },
      );
    }

    const [products, campaigns] = await Promise.all([
      getAllProducts(),
      getMarketingCampaigns(),
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

    if (customer && loyaltyPointsEarned > 0) {
      await createOrUpdateCustomerFromPurchase({
        name: customer.name,
        phone: customer.phone,
        status: "active",
        loyaltyPoints: loyaltyPointsEarned,
        personalization: customer.personalization ?? {},
      });
    }

    const estimatedCostOfGoods = estimateOrderCostOfGoods(
      { items } as Order,
      productById,
    );
    const paymentMethod = payload.paymentMethod ?? "cash";
    const isBankTransfer = paymentMethod === "bank_transfer";
    const isPayOSPayment = isBankTransfer && isPayOSEnabled();
    const orderPayload = stripUndefinedDeep({
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
      voucherUseMode: requestedVoucher ? "pos_pickup_now" : undefined,
      voucherCode: requestedVoucher?.code,
      voucherId: requestedVoucher?.id,
      status: isBankTransfer ? "pending" : "completed",
      paymentStatus: isBankTransfer ? "pending" : "paid",
      paymentMethod,
      payosOrderCode: isPayOSPayment ? createPayOSOrderCode() : undefined,
      estimatedCostOfGoods,
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

    if (isPayOSPayment) {
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

    if (requestedVoucher && discountAmount > 0) {
      await recordVoucherRedemption({
        voucherId: requestedVoucher.id,
        voucherCode: requestedVoucher.code,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: customer?.id,
        phone: customer?.phone ?? payload.customerPhone,
        channel: "pos_pickup_now",
        subtotal: productSubtotal,
        discountAmount,
        totalAfterDiscount: totalAmount,
        source: "pos",
      });
    }

    if (!isPayOSPayment) {
      await decrementStock(items, products);
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
