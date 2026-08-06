import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/wholesale-firebase/admin";
import type { AdminPrincipal } from "@/lib/auth/admin-rbac";
import type {
  Dealer,
  SalesRouteLocation,
  SalesRouteRun,
  SalesRouteRunStatus,
  SalesRouteStop,
  SalesRouteStopStatus,
  SalesRouteTemplate,
  SalesRouteTemplateInput,
  SalesRouteVisitOutcome,
  WholesaleProduct,
} from "@/types";
import {
  canTransitionSalesRouteRun,
  canTransitionSalesRouteStop,
  summarizeRouteStops,
} from "./domain";

type RecordData = Record<string, unknown>;

const TEMPLATES = "sales_route_templates";
const RUNS = "sales_route_runs";
const STOPS = "stops";

function db() {
  return getAdminFirestore();
}

function toDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);
  return new Date(0);
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

function serialize<T>(value: T): T {
  return jsonValue(value) as T;
}

function templateFromSnapshot(id: string, data: RecordData): SalesRouteTemplate {
  return {
    id,
    name: String(data.name ?? ""),
    description: typeof data.description === "string" ? data.description : undefined,
    scheduleDays: Array.isArray(data.scheduleDays) ? data.scheduleDays.map(Number) : [],
    assignedRepId: String(data.assignedRepId ?? ""),
    assignedRepName: String(data.assignedRepName ?? ""),
    stops: Array.isArray(data.stops)
      ? data.stops.flatMap((item, index) => {
          if (!item || typeof item !== "object") return [];
          const row = item as RecordData;
          const dealerId = String(row.dealerId ?? "");
          return dealerId ? [{ dealerId, sequence: Number(row.sequence ?? index) }] : [];
        })
      : [],
    isActive: data.isActive !== false,
    createdBy: String(data.createdBy ?? ""),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function runFromSnapshot(id: string, data: RecordData): SalesRouteRun {
  return {
    id,
    templateId: String(data.templateId ?? ""),
    templateName: String(data.templateName ?? ""),
    businessDate: String(data.businessDate ?? ""),
    assignedRepId: String(data.assignedRepId ?? ""),
    assignedRepName: String(data.assignedRepName ?? ""),
    status: (data.status ?? "draft") as SalesRouteRunStatus,
    totalStops: Number(data.totalStops ?? 0),
    completedStops: Number(data.completedStops ?? 0),
    skippedStops: Number(data.skippedStops ?? 0),
    orderedStops: Number(data.orderedStops ?? 0),
    startedAt: data.startedAt ? toDate(data.startedAt) : undefined,
    completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
    createdBy: String(data.createdBy ?? ""),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function locationFromValue(value: unknown): SalesRouteLocation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as RecordData;
  const lat = Number(data.lat);
  const lng = Number(data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return {
    lat,
    lng,
    accuracy: Number.isFinite(Number(data.accuracy)) ? Number(data.accuracy) : undefined,
    capturedAt: toDate(data.capturedAt),
    address: typeof data.address === "string" ? data.address : undefined,
  };
}

function stopFromSnapshot(id: string, data: RecordData): SalesRouteStop {
  return {
    id,
    runId: String(data.runId ?? ""),
    dealerId: String(data.dealerId ?? ""),
    dealer: data.dealer as SalesRouteStop["dealer"],
    sequence: Number(data.sequence ?? 0),
    status: (data.status ?? "pending") as SalesRouteStopStatus,
    checkIn: locationFromValue(data.checkIn),
    checkOut: locationFromValue(data.checkOut),
    outcome: data.outcome as SalesRouteVisitOutcome | undefined,
    note: typeof data.note === "string" ? data.note : undefined,
    skipReason: typeof data.skipReason === "string" ? data.skipReason : undefined,
    locationExceptionReason:
      typeof data.locationExceptionReason === "string"
        ? data.locationExceptionReason
        : undefined,
    orderId: typeof data.orderId === "string" ? data.orderId : undefined,
    orderNumber: typeof data.orderNumber === "string" ? data.orderNumber : undefined,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function dealerFromSnapshot(id: string, data: RecordData): Dealer {
  return {
    id,
    name: String(data.name ?? ""),
    phone: String(data.phone ?? ""),
    email: typeof data.email === "string" ? data.email : undefined,
    address: String(data.address ?? ""),
    district: String(data.district ?? ""),
    city: String(data.city ?? ""),
    lat: Number.isFinite(Number(data.lat)) ? Number(data.lat) : undefined,
    lng: Number.isFinite(Number(data.lng)) ? Number(data.lng) : undefined,
    placeId: typeof data.placeId === "string" ? data.placeId : undefined,
    assignedRepId:
      typeof data.assignedRepId === "string" ? data.assignedRepId : undefined,
    visitCadenceDays: Number.isFinite(Number(data.visitCadenceDays))
      ? Number(data.visitCadenceDays)
      : undefined,
    lastVisitAt: data.lastVisitAt ? toDate(data.lastVisitAt) : undefined,
    nextVisitAt: data.nextVisitAt ? toDate(data.nextVisitAt) : undefined,
    type: (data.type ?? "other") as Dealer["type"],
    status: (data.status ?? "pending") as Dealer["status"],
    tier: (data.tier ?? "regular") as Dealer["tier"],
    discountPercent: Number(data.discountPercent ?? 0),
    creditLimit: Number(data.creditLimit ?? 0),
    currentDebt: Number(data.currentDebt ?? 0),
    paymentTerms: (data.paymentTerms ?? "cod") as Dealer["paymentTerms"],
    businessLicense:
      typeof data.businessLicense === "string" ? data.businessLicense : undefined,
    taxId: typeof data.taxId === "string" ? data.taxId : undefined,
    contactPerson:
      typeof data.contactPerson === "string" ? data.contactPerson : undefined,
    contactPhone:
      typeof data.contactPhone === "string" ? data.contactPhone : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : undefined,
    approvedAt: data.approvedAt ? toDate(data.approvedAt) : undefined,
    rejectionReason:
      typeof data.rejectionReason === "string" ? data.rejectionReason : undefined,
    totalOrders: Number(data.totalOrders ?? 0),
    totalSpent: Number(data.totalSpent ?? 0),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export async function listSalesRouteTemplates() {
  const snapshot = await db().collection(TEMPLATES).orderBy("name", "asc").get();
  return serialize(snapshot.docs.map((item) => templateFromSnapshot(item.id, item.data())));
}

export async function listRouteDealers() {
  const snapshot = await db().collection("dealers").get();
  return serialize(
    snapshot.docs
      .map((item) => dealerFromSnapshot(item.id, item.data()))
      .filter((dealer) => dealer.status === "approved")
      .sort((a, b) => a.name.localeCompare(b.name, "vi")),
  );
}

export async function listRouteWholesaleProducts() {
  const snapshot = await db().collection("wholesale_products").get();
  return serialize(
    snapshot.docs.map((item): WholesaleProduct => {
      const data = item.data();
      return {
        id: item.id,
        productId: String(data.productId ?? ""),
        productName: String(data.productName ?? ""),
        wholesalePrice: Number(data.wholesalePrice ?? 0),
        minimumOrderQuantity: Number(data.minimumOrderQuantity ?? 1),
        stock: Number(data.stock ?? 0),
        isAvailable: data.isAvailable !== false,
        orderIncrement: Number(data.orderIncrement ?? 1),
        sellUnitLabel: String(data.sellUnitLabel ?? "đơn vị"),
        unitsPerSellUnit: Number(data.unitsPerSellUnit ?? 1),
        sellUnitSku: data.sellUnitSku ? String(data.sellUnitSku) : undefined,
        sellUnitBarcode: data.sellUnitBarcode
          ? String(data.sellUnitBarcode)
          : undefined,
        locationId: String(data.locationId ?? "main"),
        leadTimeHours: Number(data.leadTimeHours ?? 0),
        priceBreaks: Array.isArray(data.priceBreaks) ? data.priceBreaks : [],
        eligibleDealerTypes: Array.isArray(data.eligibleDealerTypes)
          ? data.eligibleDealerTypes
          : [],
        eligibleDealerTiers: Array.isArray(data.eligibleDealerTiers)
          ? data.eligibleDealerTiers
          : [],
        deliveryAreas: Array.isArray(data.deliveryAreas)
          ? data.deliveryAreas
          : [],
        tierDiscounts: data.tierDiscounts,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      };
    }),
  );
}

export async function listSalesRouteRuns(
  businessDate: string,
  principal: AdminPrincipal,
) {
  const snapshot = await db()
    .collection(RUNS)
    .where("businessDate", "==", businessDate)
    .get();
  const runs = snapshot.docs
    .map((item) => runFromSnapshot(item.id, item.data()))
    .filter((run) => principal.role !== "sales" || run.assignedRepId === principal.id)
    .sort((a, b) => a.assignedRepName.localeCompare(b.assignedRepName, "vi"));
  return serialize(runs);
}

export async function getSalesRouteRun(
  runId: string,
  principal: AdminPrincipal,
) {
  const runSnapshot = await db().collection(RUNS).doc(runId).get();
  if (!runSnapshot.exists) return null;
  const run = runFromSnapshot(runSnapshot.id, runSnapshot.data() ?? {});
  if (principal.role === "sales" && run.assignedRepId !== principal.id) {
    throw new Error("ROUTE_FORBIDDEN");
  }
  const stopsSnapshot = await runSnapshot.ref.collection(STOPS).orderBy("sequence", "asc").get();
  run.stops = stopsSnapshot.docs.map((item) => stopFromSnapshot(item.id, item.data()));
  return serialize(run);
}

export async function createSalesRouteTemplate(
  input: SalesRouteTemplateInput,
  principal: AdminPrincipal,
) {
  const uniqueDealerIds = [...new Set(input.dealerIds)];
  const dealerRefs = uniqueDealerIds.map((id) => db().collection("dealers").doc(id));
  const dealerSnapshots = dealerRefs.length ? await db().getAll(...dealerRefs) : [];
  if (
    dealerSnapshots.some(
      (snapshot) => !snapshot.exists || snapshot.data()?.status !== "approved",
    )
  ) {
    throw new Error("INVALID_ROUTE_DEALER");
  }

  const reference = db().collection(TEMPLATES).doc();
  await reference.create({
    name: input.name,
    description: input.description ?? null,
    scheduleDays: input.scheduleDays,
    assignedRepId: input.assignedRepId,
    assignedRepName: input.assignedRepName,
    stops: uniqueDealerIds.map((dealerId, sequence) => ({ dealerId, sequence })),
    isActive: true,
    createdBy: principal.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const created = await reference.get();
  return serialize(templateFromSnapshot(created.id, created.data() ?? {}));
}

export async function createSalesRouteRun(
  templateId: string,
  businessDate: string,
  principal: AdminPrincipal,
) {
  const templateSnapshot = await db().collection(TEMPLATES).doc(templateId).get();
  if (!templateSnapshot.exists) throw new Error("ROUTE_TEMPLATE_NOT_FOUND");
  const template = templateFromSnapshot(templateSnapshot.id, templateSnapshot.data() ?? {});
  if (!template.isActive) throw new Error("ROUTE_TEMPLATE_INACTIVE");

  const dealerRefs = template.stops.map((stop) =>
    db().collection("dealers").doc(stop.dealerId),
  );
  const dealerSnapshots = dealerRefs.length ? await db().getAll(...dealerRefs) : [];
  if (dealerSnapshots.some((snapshot) => !snapshot.exists)) {
    throw new Error("ROUTE_DEALER_NOT_FOUND");
  }
  if (dealerSnapshots.some((snapshot) => snapshot.data()?.status !== "approved")) {
    throw new Error("INVALID_ROUTE_DEALER");
  }
  const dealers = new Map(
    dealerSnapshots.map((snapshot) => [
      snapshot.id,
      dealerFromSnapshot(snapshot.id, snapshot.data() ?? {}),
    ]),
  );

  const runId = `${businessDate}_${templateId}`;
  const runRef = db().collection(RUNS).doc(runId);
  const batch = db().batch();
  batch.create(runRef, {
    templateId,
    templateName: template.name,
    businessDate,
    assignedRepId: template.assignedRepId,
    assignedRepName: template.assignedRepName,
    status: "published",
    totalStops: template.stops.length,
    completedStops: 0,
    skippedStops: 0,
    orderedStops: 0,
    createdBy: principal.id,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  template.stops.forEach((templateStop) => {
    const dealer = dealers.get(templateStop.dealerId)!;
    batch.create(runRef.collection(STOPS).doc(templateStop.dealerId), {
      runId,
      dealerId: dealer.id,
      sequence: templateStop.sequence,
      status: "pending",
      dealer: {
        name: dealer.name,
        phone: dealer.phone,
        address: dealer.address,
        district: dealer.district,
        city: dealer.city,
        contactPerson: dealer.contactPerson ?? null,
        currentDebt: dealer.currentDebt,
        creditLimit: dealer.creditLimit,
        paymentTerms: dealer.paymentTerms,
        lat: dealer.lat ?? null,
        lng: dealer.lng ?? null,
        placeId: dealer.placeId ?? null,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  return getSalesRouteRun(runId, principal);
}

export async function transitionSalesRouteRun(
  runId: string,
  nextStatus: SalesRouteRunStatus,
  principal: AdminPrincipal,
) {
  const runRef = db().collection(RUNS).doc(runId);
  await db().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(runRef);
    if (!snapshot.exists) throw new Error("ROUTE_RUN_NOT_FOUND");
    const run = runFromSnapshot(snapshot.id, snapshot.data() ?? {});
    if (principal.role === "sales" && run.assignedRepId !== principal.id) {
      throw new Error("ROUTE_FORBIDDEN");
    }
    if (!canTransitionSalesRouteRun(run.status, nextStatus)) {
      throw new Error("INVALID_ROUTE_RUN_TRANSITION");
    }
    if (nextStatus === "completed") {
      const stops = await transaction.get(runRef.collection(STOPS));
      if (
        stops.docs.some((item) =>
          !["completed", "skipped"].includes(String(item.data().status)),
        )
      ) {
        throw new Error("ROUTE_HAS_OPEN_STOPS");
      }
    }
    transaction.update(runRef, {
      status: nextStatus,
      ...(nextStatus === "in_progress"
        ? { startedAt: FieldValue.serverTimestamp() }
        : {}),
      ...(nextStatus === "completed"
        ? { completedAt: FieldValue.serverTimestamp() }
        : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return getSalesRouteRun(runId, principal);
}

export async function updateSalesRouteStop(input: {
  runId: string;
  stopId: string;
  status: SalesRouteStopStatus;
  principal: AdminPrincipal;
  location?: Omit<SalesRouteLocation, "capturedAt">;
  locationExceptionReason?: string;
  outcome?: SalesRouteVisitOutcome;
  note?: string;
  skipReason?: string;
}) {
  const runRef = db().collection(RUNS).doc(input.runId);
  const stopRef = runRef.collection(STOPS).doc(input.stopId);
  await db().runTransaction(async (transaction) => {
    const [runSnapshot, stopSnapshot, stopsSnapshot] = await Promise.all([
      transaction.get(runRef),
      transaction.get(stopRef),
      transaction.get(runRef.collection(STOPS)),
    ]);
    if (!runSnapshot.exists) throw new Error("ROUTE_RUN_NOT_FOUND");
    if (!stopSnapshot.exists) throw new Error("ROUTE_STOP_NOT_FOUND");
    const run = runFromSnapshot(runSnapshot.id, runSnapshot.data() ?? {});
    if (
      input.principal.role === "sales" &&
      run.assignedRepId !== input.principal.id
    ) {
      throw new Error("ROUTE_FORBIDDEN");
    }
    if (run.status !== "in_progress") throw new Error("ROUTE_NOT_IN_PROGRESS");
    const stop = stopFromSnapshot(stopSnapshot.id, stopSnapshot.data() ?? {});
    if (stop.status === input.status) return;
    if (!canTransitionSalesRouteStop(stop.status, input.status)) {
      throw new Error("INVALID_ROUTE_STOP_TRANSITION");
    }
    if (
      input.status === "arrived" &&
      !input.location &&
      !input.locationExceptionReason?.trim()
    ) {
      throw new Error("ROUTE_LOCATION_REQUIRED");
    }
    if (input.status === "completed" && !input.outcome) {
      throw new Error("ROUTE_OUTCOME_REQUIRED");
    }
    if (input.status === "skipped" && !input.skipReason?.trim()) {
      throw new Error("ROUTE_SKIP_REASON_REQUIRED");
    }

    const update: RecordData = {
      status: input.status,
      updatedBy: input.principal.id,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (input.location) {
      const location = { ...input.location, capturedAt: FieldValue.serverTimestamp() };
      if (input.status === "arrived") update.checkIn = location;
      if (input.status === "completed") update.checkOut = location;
    }
    if (input.locationExceptionReason) {
      update.locationExceptionReason = input.locationExceptionReason.trim();
    }
    if (input.outcome) update.outcome = input.outcome;
    if (input.note !== undefined) update.note = input.note.trim();
    if (input.skipReason) update.skipReason = input.skipReason.trim();
    transaction.update(stopRef, update);

    const prospectiveStops = stopsSnapshot.docs.map((item) => {
      const current = stopFromSnapshot(item.id, item.data());
      return item.id === input.stopId
        ? { ...current, status: input.status, outcome: input.outcome }
        : current;
    });
    transaction.update(runRef, {
      ...summarizeRouteStops(prospectiveStops),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  if (input.status === "completed") {
    const completedStop = await stopRef.get();
    const dealerId = String(completedStop.data()?.dealerId ?? "");
    const dealerRef = db().collection("dealers").doc(dealerId);
    const dealerSnapshot = await dealerRef.get();
    const visitCadenceDays = Number(dealerSnapshot.data()?.visitCadenceDays);
    const nextVisitAt =
      Number.isInteger(visitCadenceDays) && visitCadenceDays > 0
        ? Timestamp.fromDate(
            new Date(Date.now() + visitCadenceDays * 24 * 60 * 60 * 1_000),
          )
        : undefined;
    await dealerRef.set(
      {
        lastVisitAt: FieldValue.serverTimestamp(),
        ...(nextVisitAt ? { nextVisitAt } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }
  return getSalesRouteRun(input.runId, input.principal);
}
