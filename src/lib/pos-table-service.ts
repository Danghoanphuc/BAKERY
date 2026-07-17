import { randomUUID } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { generateCartItemId, type CartItem } from "@/types";
import type {
  PosTable,
  PosTableOrderRound,
  PosKitchenTicket,
  PosTableRoundStatus,
  PosTableServiceSnapshot,
  PosTableStatus,
  PosTableTab,
} from "@/types/pos-table";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/strip-undefined";

const TABLES_COLLECTION = "pos_tables";
const TABS_COLLECTION = "pos_table_tabs";
const DEFAULT_TABLE_COUNT = 12;

export type TableServiceActor = { id: string; name: string };

type StoredTable = Omit<PosTable, "id" | "openedAt" | "updatedAt"> & {
  openedAt?: Timestamp;
  updatedAt: Timestamp;
};

type StoredRound = Omit<PosTableOrderRound, "sentAt"> & { sentAt: Timestamp };

type StoredTab = Omit<
  PosTableTab,
  "id" | "rounds" | "openedAt" | "updatedAt" | "paidAt" | "closedAt"
> & {
  rounds: StoredRound[];
  openedAt: Timestamp;
  updatedAt: Timestamp;
  paidAt?: Timestamp;
  closedAt?: Timestamp;
};

function toIso(value?: Timestamp) {
  return value?.toDate().toISOString();
}

function serializeTable(id: string, data: StoredTable): PosTable {
  return {
    ...data,
    id,
    openedAt: toIso(data.openedAt),
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
  };
}

function serializeTab(id: string, data: StoredTab): PosTableTab {
  return {
    ...data,
    id,
    rounds: (data.rounds ?? []).map((round) => ({
      ...round,
      status: round.status ?? "queued",
      items: normalizeTableCartItems(round.items ?? []),
      sentAt: toIso(round.sentAt) ?? new Date().toISOString(),
    })),
    draftItems: normalizeTableCartItems(data.draftItems ?? []),
    openedAt: toIso(data.openedAt) ?? new Date().toISOString(),
    updatedAt: toIso(data.updatedAt) ?? new Date().toISOString(),
    paidAt: toIso(data.paidAt),
    closedAt: toIso(data.closedAt),
  };
}

export function normalizeTableCartItems(items: CartItem[]) {
  const normalized = items.map((item) => {
    const cartItemId =
      item.cartItemId ||
      generateCartItemId(
        item.productId,
        item.selectedSize,
        item.selectedFlavor,
        item.customMessage,
        item.candles,
        item.selectedSizeSku,
        item.selectedFlavorSku,
      );
    return stripUndefined({
      cartItemId,
      productId: item.productId,
      productName: item.productName,
      quantity: Math.max(1, Math.floor(item.quantity)),
      price: Math.max(0, Math.floor(item.price)),
      imageUrl: item.imageUrl ?? "",
      selectedSize: item.selectedSize,
      selectedSizeLabel: item.selectedSizeLabel,
      selectedSizeSku: item.selectedSizeSku,
      selectedFlavor: item.selectedFlavor,
      selectedFlavorLabel: item.selectedFlavorLabel,
      selectedFlavorSku: item.selectedFlavorSku,
      customMessage: item.customMessage,
      candles: item.candles,
    }) as CartItem;
  });

  return normalized.reduce<CartItem[]>((result, item) => {
    const existing = result.find(
      (candidate) => candidate.cartItemId === item.cartItemId,
    );
    if (existing) existing.quantity += item.quantity;
    else result.push({ ...item });
    return result;
  }, []);
}

export function getTabItems(tab: Pick<PosTableTab, "rounds" | "draftItems">) {
  return [...tab.rounds.flatMap((round) => round.items), ...tab.draftItems];
}

export function getTabTotals(tab: Pick<PosTableTab, "rounds" | "draftItems">) {
  const items = getTabItems(tab);
  return {
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

async function ensureDefaultTables() {
  const db = getAdminFirestore();
  const existing = await db.collection(TABLES_COLLECTION).limit(1).get();
  if (!existing.empty) return;

  const batch = db.batch();
  const now = Timestamp.now();
  for (let index = 1; index <= DEFAULT_TABLE_COUNT; index += 1) {
    const id = `table-${String(index).padStart(2, "0")}`;
    batch.set(db.collection(TABLES_COLLECTION).doc(id), {
      name: `Bàn ${String(index).padStart(2, "0")}`,
      area: index <= 6 ? "Trong nhà" : "Ngoài hiên",
      capacity: index % 3 === 0 ? 4 : 2,
      sortOrder: index,
      status: "available",
      updatedAt: now,
    } satisfies StoredTable);
  }
  await batch.commit();
}

export async function getTableServiceSnapshot(
  tableId?: string,
): Promise<PosTableServiceSnapshot> {
  await ensureDefaultTables();
  const db = getAdminFirestore();
  const tableSnapshot = await db.collection(TABLES_COLLECTION).get();
  const tables = tableSnapshot.docs
    .map((document) => serializeTable(document.id, document.data() as StoredTable))
    .sort((left, right) => left.sortOrder - right.sortOrder);

  const selectedTable = tableId
    ? tables.find((table) => table.id === tableId)
    : undefined;
  let activeTab: PosTableTab | undefined;
  if (selectedTable?.currentTabId) {
    const tabSnapshot = await db
      .collection(TABS_COLLECTION)
      .doc(selectedTable.currentTabId)
      .get();
    if (tabSnapshot.exists) {
      activeTab = serializeTab(tabSnapshot.id, tabSnapshot.data() as StoredTab);
    }
  }

  return { tables, activeTab };
}

export async function openTable(tableId: string, actor: TableServiceActor) {
  const db = getAdminFirestore();
  const tableRef = db.collection(TABLES_COLLECTION).doc(tableId);
  const tabRef = db.collection(TABS_COLLECTION).doc(randomUUID());

  const result = await db.runTransaction(async (transaction) => {
    const tableSnapshot = await transaction.get(tableRef);
    if (!tableSnapshot.exists) throw new Error("TABLE_NOT_FOUND");
    const table = tableSnapshot.data() as StoredTable;

    if (table.currentTabId) {
      const currentTabRef = db.collection(TABS_COLLECTION).doc(table.currentTabId);
      const currentTabSnapshot = await transaction.get(currentTabRef);
      if (currentTabSnapshot.exists) {
        return serializeTab(
          currentTabSnapshot.id,
          currentTabSnapshot.data() as StoredTab,
        );
      }
    }

    const now = Timestamp.now();
    const storedTab: StoredTab = {
      tableId,
      tableName: table.name,
      status: "open",
      rounds: [],
      draftItems: [],
      subtotal: 0,
      totalQuantity: 0,
      openedById: actor.id,
      openedByName: actor.name,
      openedAt: now,
      updatedAt: now,
    };
    transaction.set(tabRef, storedTab);
    transaction.update(tableRef, {
      status: "occupied" satisfies PosTableStatus,
      currentTabId: tabRef.id,
      assignedStaffId: actor.id,
      assignedStaffName: actor.name,
      openedAt: now,
      updatedAt: now,
    });
    return serializeTab(tabRef.id, storedTab);
  });

  return result;
}

export async function saveTableDraft(
  tabId: string,
  items: CartItem[],
  details: { note?: string; customerName?: string; customerPhone?: string },
) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);
  const cleanItems = normalizeTableCartItems(items);

  return db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    if (tab.status !== "open") throw new Error("TAB_LOCKED");

    const totals = getTabTotals({
      rounds: serializeTab(tabSnapshot.id, tab).rounds,
      draftItems: cleanItems,
    });
    transaction.update(
      tabRef,
      stripUndefined({
        draftItems: cleanItems,
        subtotal: totals.subtotal,
        totalQuantity: totals.totalQuantity,
        note: details.note?.trim() || FieldValue.delete(),
        customerName: details.customerName?.trim() || FieldValue.delete(),
        customerPhone:
          details.customerPhone?.replace(/\s+/g, "").trim() || FieldValue.delete(),
        updatedAt: Timestamp.now(),
      }),
    );
    return {
      ...serializeTab(tabSnapshot.id, tab),
      draftItems: cleanItems,
      ...totals,
      note: details.note?.trim() || undefined,
      customerName: details.customerName?.trim() || undefined,
      customerPhone: details.customerPhone?.replace(/\s+/g, "").trim() || undefined,
      updatedAt: new Date().toISOString(),
    };
  });
}

export async function sendTableRound(
  tabId: string,
  actor: TableServiceActor,
  note?: string,
) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);

  return db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    if (tab.status !== "open") throw new Error("TAB_LOCKED");
    if (!tab.draftItems.length) throw new Error("EMPTY_DRAFT");

    const now = Timestamp.now();
    const round: StoredRound = {
      id: randomUUID(),
      number: tab.rounds.length + 1,
      items: tab.draftItems,
      note: note?.trim() || undefined,
      status: "queued",
      sentAt: now,
      sentById: actor.id,
      sentByName: actor.name,
    };
    const rounds = [...tab.rounds, stripUndefined(round) as StoredRound];
    const totals = getTabTotals({
      rounds: rounds.map((item) => ({
        ...item,
        sentAt: toIso(item.sentAt) ?? new Date().toISOString(),
      })),
      draftItems: [],
    });
    transaction.update(tabRef, {
      rounds,
      draftItems: [],
      ...totals,
      updatedAt: now,
    });
    return serializeTab(tabSnapshot.id, {
      ...tab,
      rounds,
      draftItems: [],
      ...totals,
      updatedAt: now,
    });
  });
}

export async function attachTablePayment(
  tabId: string,
  payment: {
    orderId: string;
    orderNumber: string;
    method: "cash" | "bank_transfer";
    status: "pending" | "paid";
    qrCode?: string;
    checkoutUrl?: string;
  },
) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);

  await db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    if (tab.status === "closed") throw new Error("TAB_LOCKED");
    if (tab.draftItems.length) throw new Error("UNSENT_ITEMS");

    const now = Timestamp.now();
    const paid = payment.status === "paid";
    transaction.update(
      tabRef,
      stripUndefined({
        status: paid ? "paid" : "payment_pending",
        paymentOrderId: payment.orderId,
        paymentOrderNumber: payment.orderNumber,
        paymentMethod: payment.method,
        paymentStatus: payment.status,
        paymentQrCode: payment.qrCode,
        paymentCheckoutUrl: payment.checkoutUrl,
        paidAt: paid ? now : undefined,
        updatedAt: now,
      }),
    );
    transaction.update(db.collection(TABLES_COLLECTION).doc(tab.tableId), {
      status: paid ? "paid" : "payment_requested",
      updatedAt: now,
    });
  });
}

export async function confirmTablePayment(tabId: string) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);
  await db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    if (tab.status !== "payment_pending") throw new Error("TAB_LOCKED");
    const now = Timestamp.now();
    transaction.update(tabRef, {
      status: "paid",
      paymentStatus: "paid",
      paidAt: now,
      updatedAt: now,
    });
    transaction.update(db.collection(TABLES_COLLECTION).doc(tab.tableId), {
      status: "paid",
      updatedAt: now,
    });
  });
}

export async function reopenPendingTablePayment(tabId: string) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);
  await db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    if (tab.status !== "payment_pending") throw new Error("TAB_LOCKED");
    const now = Timestamp.now();
    transaction.update(tabRef, {
      status: "open",
      paymentOrderId: FieldValue.delete(),
      paymentOrderNumber: FieldValue.delete(),
      paymentMethod: FieldValue.delete(),
      paymentStatus: FieldValue.delete(),
      paymentQrCode: FieldValue.delete(),
      paymentCheckoutUrl: FieldValue.delete(),
      updatedAt: now,
    });
    transaction.update(db.collection(TABLES_COLLECTION).doc(tab.tableId), {
      status: "occupied",
      updatedAt: now,
    });
  });
}

export async function abandonEmptyTable(tabId: string) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);
  await db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    if (tab.status !== "open") throw new Error("TAB_LOCKED");
    if (tab.rounds.length || tab.draftItems.length) throw new Error("TAB_NOT_EMPTY");
    const now = Timestamp.now();
    transaction.update(tabRef, {
      status: "closed",
      closedAt: now,
      updatedAt: now,
    });
    transaction.update(db.collection(TABLES_COLLECTION).doc(tab.tableId), {
      status: "available",
      currentTabId: FieldValue.delete(),
      assignedStaffId: FieldValue.delete(),
      assignedStaffName: FieldValue.delete(),
      openedAt: FieldValue.delete(),
      updatedAt: now,
    });
  });
}

export async function closePaidTable(tabId: string) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);
  await db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    if (tab.status !== "paid") throw new Error("PAYMENT_REQUIRED");
    const now = Timestamp.now();
    transaction.update(tabRef, {
      status: "closed",
      closedAt: now,
      updatedAt: now,
    });
    transaction.update(db.collection(TABLES_COLLECTION).doc(tab.tableId), {
      status: "needs_cleaning",
      currentTabId: FieldValue.delete(),
      assignedStaffId: FieldValue.delete(),
      assignedStaffName: FieldValue.delete(),
      openedAt: FieldValue.delete(),
      updatedAt: now,
    });
  });
}

export async function releaseCleanTable(tableId: string) {
  const ref = getAdminFirestore().collection(TABLES_COLLECTION).doc(tableId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("TABLE_NOT_FOUND");
  const table = snapshot.data() as StoredTable;
  if (table.status !== "needs_cleaning") throw new Error("TABLE_LOCKED");
  await ref.update({ status: "available", updatedAt: Timestamp.now() });
}

export async function getKitchenQueue(): Promise<PosKitchenTicket[]> {
  const snapshot = await getAdminFirestore().collection(TABS_COLLECTION).get();
  return snapshot.docs
    .map((document) => serializeTab(document.id, document.data() as StoredTab))
    .filter((tab) => tab.status !== "closed")
    .flatMap((tab) =>
      tab.rounds
        .filter((round) => (round.status ?? "queued") !== "served")
        .map((round) => ({
          tabId: tab.id,
          tableId: tab.tableId,
          tableName: tab.tableName,
          round: { ...round, status: round.status ?? "queued" },
        })),
    )
    .sort(
      (left, right) =>
        new Date(left.round.sentAt).getTime() - new Date(right.round.sentAt).getTime(),
    );
}

export async function updateKitchenRoundStatus(
  tabId: string,
  roundId: string,
  status: PosTableRoundStatus,
) {
  const db = getAdminFirestore();
  const tabRef = db.collection(TABS_COLLECTION).doc(tabId);
  await db.runTransaction(async (transaction) => {
    const tabSnapshot = await transaction.get(tabRef);
    if (!tabSnapshot.exists) throw new Error("TAB_NOT_FOUND");
    const tab = tabSnapshot.data() as StoredTab;
    const roundIndex = tab.rounds.findIndex((round) => round.id === roundId);
    if (roundIndex < 0) throw new Error("ROUND_NOT_FOUND");
    const current = tab.rounds[roundIndex];
    const allowed: Record<PosTableRoundStatus, PosTableRoundStatus[]> = {
      queued: ["preparing"],
      preparing: ["ready"],
      ready: ["served"],
      served: [],
    };
    const currentStatus = current.status ?? "queued";
    if (!allowed[currentStatus].includes(status)) throw new Error("INVALID_ROUND_STATUS");
    const rounds = tab.rounds.map((round, index) =>
      index === roundIndex ? { ...round, status } : round,
    );
    transaction.update(tabRef, { rounds, updatedAt: Timestamp.now() });
  });
}
