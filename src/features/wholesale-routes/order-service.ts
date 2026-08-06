import { createHash } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import { generateOrderNumber, getAllProducts } from "@/lib/wholesale-db";
import {
  buildItemFinancialSnapshots,
  captureOrderFinancials,
  getStandardCostCatalog,
} from "@/features/wholesale-finance";
import type { AdminPrincipal } from "@/lib/auth/admin-rbac";
import type {
  CartItem,
  Dealer,
  Order,
  WholesaleRouteOrderLineInput,
} from "@/types";

type RecordData = Record<string, unknown>;

function db() {
  return getAdminFirestore();
}

function toDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return new Date();
}

function jsonValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as RecordData).map(([key, item]) => [key, jsonValue(item)]),
    );
  }
  return value;
}

function priceForDealer(
  wholesaleProduct: RecordData,
  dealer: RecordData,
  quantity: number,
) {
  const tier = String(dealer.tier ?? "regular") as Dealer["tier"];
  const discounts = wholesaleProduct.tierDiscounts as
    | Record<string, number>
    | undefined;
  const discountPercent = Math.max(
    0,
    Math.min(
      100,
      Number(discounts?.[tier] ?? dealer.discountPercent ?? 0),
    ),
  );
  const priceBreaks = Array.isArray(wholesaleProduct.priceBreaks)
    ? wholesaleProduct.priceBreaks as Array<RecordData>
    : [];
  const basePrice = priceBreaks
    .map((item) => ({
      minQuantity: Number(item.minQuantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
    }))
    .filter((item) =>
      Number.isInteger(item.minQuantity) &&
      item.minQuantity > 0 &&
      Number.isInteger(item.unitPrice) &&
      item.unitPrice > 0 &&
      quantity >= item.minQuantity)
    .sort((left, right) => right.minQuantity - left.minQuantity)[0]?.unitPrice ??
    Number(wholesaleProduct.wholesalePrice ?? 0);
  return Math.round(basePrice * (1 - discountPercent / 100));
}

function orderFromData(id: string, data: RecordData): Order {
  return {
    ...(data as unknown as Order),
    id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function safeIdempotencyDocument(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export async function createSalesRouteOrder(input: {
  runId: string;
  stopId: string;
  lines: WholesaleRouteOrderLineInput[];
  idempotencyKey: string;
  note?: string;
  principal: AdminPrincipal;
}) {
  const database = db();
  const runRef = database.collection("sales_route_runs").doc(input.runId);
  const stopRef = runRef.collection("stops").doc(input.stopId);
  const idempotencyRef = database
    .collection("wholesale_route_order_keys")
    .doc(safeIdempotencyDocument(input.idempotencyKey));
  const orderRef = database.collection("orders").doc();
  const debtRef = database.collection("debt_records").doc();

  const result = await database.runTransaction(async (transaction) => {
    const [keySnapshot, runSnapshot, stopSnapshot] = await Promise.all([
      transaction.get(idempotencyRef),
      transaction.get(runRef),
      transaction.get(stopRef),
    ]);
    if (!runSnapshot.exists) throw new Error("ROUTE_RUN_NOT_FOUND");
    if (!stopSnapshot.exists) throw new Error("ROUTE_STOP_NOT_FOUND");

    const run = runSnapshot.data() ?? {};
    const stop = stopSnapshot.data() ?? {};
    const stopDealer =
      stop.dealer && typeof stop.dealer === "object"
        ? stop.dealer as RecordData
        : {};
    if (
      input.principal.role === "sales" &&
      String(run.assignedRepId ?? "") !== input.principal.id
    ) {
      throw new Error("ROUTE_FORBIDDEN");
    }
    if (keySnapshot.exists) {
      if (
        keySnapshot.data()?.routeRunId !== input.runId ||
        keySnapshot.data()?.routeStopId !== input.stopId
      ) {
        throw new Error("IDEMPOTENCY_KEY_REUSED");
      }
      const existingOrderId = String(keySnapshot.data()?.orderId ?? "");
      const existing = await transaction.get(database.collection("orders").doc(existingOrderId));
      if (!existing.exists) throw new Error("IDEMPOTENCY_ORDER_MISSING");
      return { order: orderFromData(existing.id, existing.data() ?? {}), created: false };
    }
    if (run.status !== "in_progress") throw new Error("ROUTE_NOT_IN_PROGRESS");
    if (stop.status !== "arrived") throw new Error("ROUTE_STOP_NOT_ARRIVED");
    if (stop.orderId) throw new Error("ROUTE_STOP_ALREADY_ORDERED");

    const dealerRef = database.collection("dealers").doc(String(stop.dealerId ?? ""));
    const dealerSnapshot = await transaction.get(dealerRef);
    if (!dealerSnapshot.exists || dealerSnapshot.data()?.status !== "approved") {
      throw new Error("DEALER_NOT_APPROVED");
    }
    const dealer = dealerSnapshot.data() ?? {};
    const uniqueLines = new Map<string, number>();
    input.lines.forEach((line) => {
      const quantity =
        (uniqueLines.get(line.wholesaleProductId) ?? 0) + line.quantity;
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100_000) {
        throw new Error("WHOLESALE_QUANTITY_INVALID");
      }
      uniqueLines.set(line.wholesaleProductId, quantity);
    });
    const productRefs = [...uniqueLines.keys()].map((id) =>
      database.collection("wholesale_products").doc(id),
    );
    const productSnapshots = await Promise.all(
      productRefs.map((reference) => transaction.get(reference)),
    );
    const inventoryLocations = new Set(
      productSnapshots
        .filter((snapshot) => snapshot.exists)
        .map((snapshot) => String(snapshot.data()?.locationId ?? "main")),
    );
    if (inventoryLocations.size > 1) {
      throw new Error("WHOLESALE_LOCATION_MIXED");
    }
    const inventoryLocationId = [...inventoryLocations][0] ?? "main";

    const items: CartItem[] = productSnapshots.map((snapshot) => {
      if (!snapshot.exists) throw new Error("WHOLESALE_PRODUCT_NOT_FOUND");
      const product = snapshot.data() ?? {};
      const quantity = uniqueLines.get(snapshot.id) ?? 0;
      const minimum = Number(product.minimumOrderQuantity ?? 1);
      const increment = Number(product.orderIncrement ?? 1);
      if (
        !Number.isInteger(minimum) ||
        minimum <= 0 ||
        !Number.isInteger(increment) ||
        increment <= 0 ||
        !Number.isInteger(quantity) ||
        quantity < minimum ||
        quantity % increment !== 0
      ) {
        throw new Error("WHOLESALE_MINIMUM_NOT_MET");
      }
      const eligibleDealerTypes = Array.isArray(product.eligibleDealerTypes)
        ? product.eligibleDealerTypes.map(String)
        : [];
      const eligibleDealerTiers = Array.isArray(product.eligibleDealerTiers)
        ? product.eligibleDealerTiers.map(String)
        : [];
      if (
        (eligibleDealerTypes.length > 0 &&
          !eligibleDealerTypes.includes(String(dealer.type ?? ""))) ||
        (eligibleDealerTiers.length > 0 &&
          !eligibleDealerTiers.includes(String(dealer.tier ?? "regular")))
      ) {
        throw new Error("WHOLESALE_PRODUCT_NOT_ELIGIBLE");
      }
      const stock = Number(product.stock ?? 0);
      if (
        product.isAvailable === false ||
        !Number.isFinite(stock) ||
        stock < quantity
      ) {
        throw new Error("WHOLESALE_STOCK_UNAVAILABLE");
      }
      const price = priceForDealer(product, dealer, quantity);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("WHOLESALE_PRICE_INVALID");
      }
      return {
        cartItemId: `wholesale:${snapshot.id}`,
        productId: String(product.productId ?? ""),
        productName: String(product.productName ?? ""),
        quantity,
        price,
        imageUrl: "",
        sellUnitLabel: String(product.sellUnitLabel ?? "đơn vị"),
        inventoryQuantityPerUnit: Number(product.unitsPerSellUnit ?? 1),
      };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) {
      throw new Error("WHOLESALE_PRICE_INVALID");
    }
    const paymentTerms = (dealer.paymentTerms ?? "cod") as Dealer["paymentTerms"];
    const currentDebt = Number(dealer.currentDebt ?? 0);
    const creditLimit = Number(dealer.creditLimit ?? 0);
    if (
      paymentTerms !== "cod" &&
      creditLimit > 0 &&
      currentDebt + totalAmount > creditLimit
    ) {
      throw new Error("DEALER_CREDIT_LIMIT_EXCEEDED");
    }

    const now = new Date();
    const orderNumber = generateOrderNumber();
    const orderData = {
      orderNumber,
      idempotencyKey: input.idempotencyKey,
      dealerId: dealerSnapshot.id,
      customerName: String(dealer.name ?? stopDealer.name ?? ""),
      customerPhone: String(dealer.phone ?? stopDealer.phone ?? ""),
      items,
      totalAmount,
      productSubtotal: totalAmount,
      discountAmount: 0,
      orderType: "delivery",
      status: "confirmed",
      paymentStatus: "unpaid",
      paymentMethod: paymentTerms === "cod" ? "cod" : "other",
      paymentTerms,
      salesChannel: "wholesale",
      salesRepId: input.principal.id,
      assignedTo: input.principal.name,
      routeRunId: input.runId,
      routeStopId: input.stopId,
      inventoryLocationId,
      deliveryAddress: [
        dealer.address,
        dealer.district,
        dealer.city,
      ].filter(Boolean).join(", "),
      notes: input.note?.trim() || null,
      financialSyncPending: true,
      statusHistory: [{
        status: "confirmed",
        at: now.toISOString(),
        actor: `sales:${input.principal.id}`,
        note: "Tạo từ lượt ghé đi tuyến",
      }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.create(orderRef, orderData);
    productSnapshots.forEach((snapshot) => {
      const quantity = uniqueLines.get(snapshot.id) ?? 0;
      transaction.update(snapshot.ref, {
        stock: FieldValue.increment(-quantity),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    transaction.update(stopRef, {
      orderId: orderRef.id,
      orderNumber,
      outcome: "ordered",
      updatedBy: input.principal.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(runRef, {
      orderedStops: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(idempotencyRef, {
      key: input.idempotencyKey,
      orderId: orderRef.id,
      routeRunId: input.runId,
      routeStopId: input.stopId,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (paymentTerms !== "cod") {
      const dueDate =
        paymentTerms === "net_7"
          ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          : null;
      transaction.update(dealerRef, {
        currentDebt: FieldValue.increment(totalAmount),
        totalOrders: FieldValue.increment(1),
        totalSpent: FieldValue.increment(totalAmount),
        lastOrderAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(debtRef, {
        dealerId: dealerSnapshot.id,
        dealerName: String(dealer.name ?? ""),
        orderId: orderRef.id,
        orderNumber,
        amount: totalAmount,
        status: "current",
        dueDate,
        paymentTerms,
        paidAmount: 0,
        remainingAmount: totalAmount,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.update(dealerRef, {
        totalOrders: FieldValue.increment(1),
        totalSpent: FieldValue.increment(totalAmount),
        lastOrderAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      order: orderFromData(orderRef.id, {
        ...orderData,
        createdAt: now,
        updatedAt: now,
      }),
      created: true,
    };
  });

  if (result.created) {
    try {
      const [products, costCatalog] = await Promise.all([
        getAllProducts(),
        getStandardCostCatalog(),
      ]);
      const itemFinancialSnapshots = buildItemFinancialSnapshots({
        items: result.order.items,
        discountAmount: 0,
        products,
        recipes: costCatalog.recipes,
        ingredients: costCatalog.ingredients,
      });
      const estimatedCostOfGoods = itemFinancialSnapshots.reduce(
        (sum, item) => sum + item.totalCost,
        0,
      );
      const enrichedOrder: Order = {
        ...result.order,
        itemFinancialSnapshots,
        estimatedCostOfGoods,
        estimatedGrossProfit: result.order.totalAmount - estimatedCostOfGoods,
        financialSyncPending: false,
      };
      await orderRef.update({
        itemFinancialSnapshots,
        estimatedCostOfGoods,
        estimatedGrossProfit: enrichedOrder.estimatedGrossProfit,
        financialSyncPending: false,
        financialSyncError: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await captureOrderFinancials(enrichedOrder, `sales:${input.principal.id}`);
      result.order = enrichedOrder;
    } catch (error) {
      await orderRef.update({
        financialSyncPending: true,
        financialSyncError:
          error instanceof Error ? error.message : "FINANCIAL_SYNC_FAILED",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return jsonValue(result.order) as Order;
}
