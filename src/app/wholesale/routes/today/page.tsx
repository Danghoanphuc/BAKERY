"use client";

import "@/features/wholesale-routes/route-operations.css";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Check,
  ChevronDown,
  Circle,
  ClipboardList,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Play,
  RefreshCw,
  ShoppingBag,
  SkipForward,
  Store,
  WifiOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Order,
  SalesRouteLocation,
  SalesRouteRun,
  SalesRouteStop,
  SalesRouteVisitOutcome,
  WholesaleProduct,
} from "@/types";
import type { AdminPrincipal } from "@/lib/auth/admin-rbac";
import {
  flushRouteMutationQueue,
  sendRouteMutation,
} from "@/features/wholesale-routes/offline-queue";

type RouteContext = {
  principal: AdminPrincipal;
  businessDate: string;
  runs: SalesRouteRun[];
  products: WholesaleProduct[];
};

const OUTCOMES: Array<{ value: SalesRouteVisitOutcome; label: string }> = [
  { value: "no_order", label: "Đã gặp · chưa có đơn" },
  { value: "not_met", label: "Không gặp được" },
  { value: "follow_up", label: "Hẹn liên hệ lại" },
  { value: "closed", label: "Cửa hàng đóng cửa" },
];

function localBusinessDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Không thể hoàn tất thao tác.");
  return data;
}

function routeOrderStorageKey(runId: string, stopId: string) {
  return `sweettime:field-route-order:v1:${runId}:${stopId}`;
}

function getOrCreateRouteOrderKey(runId: string, stopId: string) {
  const storageKey = routeOrderStorageKey(runId, stopId);
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = `route_${crypto.randomUUID()}`;
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `route_${crypto.randomUUID()}`;
  }
}

function clearRouteOrderKey(runId: string, stopId: string) {
  try {
    window.localStorage.removeItem(routeOrderStorageKey(runId, stopId));
  } catch {
    // The order already exists server-side; unavailable storage needs no cleanup.
  }
}

function getLocation() {
  return new Promise<Omit<SalesRouteLocation, "capturedAt">>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ định vị."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => reject(new Error("Không lấy được vị trí hiện tại.")),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  });
}

export default function TodayRoutesPage() {
  const [businessDate] = useState(localBusinessDate);
  const [context, setContext] = useState<RouteContext | null>(null);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [run, setRun] = useState<SalesRouteRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [gpsFailureStopId, setGpsFailureStopId] = useState("");
  const [locationReason, setLocationReason] = useState("");
  const [skipReasons, setSkipReasons] = useState<Record<string, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, SalesRouteVisitOutcome>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [orderStop, setOrderStop] = useState<SalesRouteStop | null>(null);
  const online = useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true,
  );

  const loadRun = useCallback(async (runId: string) => {
    if (!runId) {
      setRun(null);
      return;
    }
    const response = await fetch(
      `/api/wholesale/field-routes/${encodeURIComponent(runId)}`,
      { cache: "no-store" },
    );
    const data = await readJson(response);
    setRun(data.run);
  }, []);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/wholesale/field-routes?date=${encodeURIComponent(businessDate)}`,
        { cache: "no-store" },
      );
      const data = await readJson(response) as RouteContext;
      setContext(data);
      const requested =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("run")
          : null;
      const nextRunId =
        requested && data.runs.some((item) => item.id === requested)
          ? requested
          : data.runs[0]?.id ?? "";
      setSelectedRunId(nextRunId);
      await loadRun(nextRunId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải tuyến hôm nay.");
    } finally {
      setLoading(false);
    }
  }, [businessDate, loadRun]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadContext(), 0);
    return () => window.clearTimeout(timer);
  }, [loadContext]);

  useEffect(() => {
    const principalId = context?.principal.id ?? "";
    if (!principalId) return;
    async function flush() {
      const result = await flushRouteMutationQueue(principalId);
      if (result.flushed > 0) {
        await loadContext();
      }
    }
    if (online) void flush();
  }, [context?.principal.id, loadContext, online]);

  async function transitionRun(status: "in_progress" | "completed") {
    if (!run) return;
    setBusy(`run:${status}`);
    try {
      const response = await fetch(
        `/api/wholesale/field-routes/${encodeURIComponent(run.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const data = await readJson(response);
      setRun(data.run);
      setContext((current) =>
        current
          ? {
              ...current,
              runs: current.runs.map((item) =>
                item.id === data.run.id ? data.run : item,
              ),
            }
          : current,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật chuyến.");
    } finally {
      setBusy("");
    }
  }

  function applyQueuedStop(
    stopId: string,
    status: SalesRouteStop["status"],
    outcome?: SalesRouteVisitOutcome,
  ) {
    setRun((current) => {
      if (!current?.stops) return current;
      const stops = current.stops.map((stop) =>
        stop.id === stopId ? { ...stop, status, outcome: outcome ?? stop.outcome } : stop,
      );
      return {
        ...current,
        stops,
        completedStops: stops.filter((stop) => stop.status === "completed").length,
        skippedStops: stops.filter((stop) => stop.status === "skipped").length,
        orderedStops: stops.filter((stop) => stop.outcome === "ordered").length,
      };
    });
  }

  async function mutateStop(
    stopId: string,
    body: Record<string, unknown> & {
      status: "arrived" | "completed" | "skipped";
      outcome?: SalesRouteVisitOutcome;
    },
  ) {
    if (!run) return;
    setBusy(`stop:${stopId}:${body.status}`);
    try {
      const result = await sendRouteMutation(
        `/api/wholesale/field-routes/${encodeURIComponent(run.id)}/stops/${encodeURIComponent(stopId)}`,
        body,
        context?.principal.id ?? "",
      );
      if (result.queued) {
        applyQueuedStop(stopId, body.status, body.outcome);
        toast.info("Đã lưu tạm trên thiết bị. Hệ thống sẽ đồng bộ khi có mạng.");
      } else {
        setRun(result.data.run);
      }
      setGpsFailureStopId("");
      setLocationReason("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật điểm ghé.");
    } finally {
      setBusy("");
    }
  }

  async function checkIn(stop: SalesRouteStop, withoutGps = false) {
    if (withoutGps) {
      await mutateStop(stop.id, {
        status: "arrived",
        locationExceptionReason: locationReason,
      });
      return;
    }
    setBusy(`stop:${stop.id}:arrived`);
    try {
      const location = await getLocation();
      await mutateStop(stop.id, { status: "arrived", location });
    } catch {
      setBusy("");
      setGpsFailureStopId(stop.id);
    }
  }

  async function completeStop(stop: SalesRouteStop) {
    const outcome = stop.orderId ? "ordered" : outcomes[stop.id];
    if (!outcome) {
      toast.error("Hãy chọn kết quả của lượt ghé.");
      return;
    }
    let location: Omit<SalesRouteLocation, "capturedAt"> | undefined;
    try {
      location = await getLocation();
    } catch {
      location = undefined;
    }
    await mutateStop(stop.id, {
      status: "completed",
      outcome,
      note: notes[stop.id] ?? "",
      location,
    });
  }

  async function skipStop(stop: SalesRouteStop) {
    await mutateStop(stop.id, {
      status: "skipped",
      skipReason: skipReasons[stop.id] ?? "",
    });
  }

  async function handleRunSelection(runId: string) {
    setSelectedRunId(runId);
    setLoading(true);
    try {
      await loadRun(runId);
      const url = new URL(window.location.href);
      url.searchParams.set("run", runId);
      window.history.replaceState(null, "", url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở chuyến.");
    } finally {
      setLoading(false);
    }
  }

  const closedStops =
    (run?.completedStops ?? 0) + (run?.skippedStops ?? 0);
  const canComplete =
    Boolean(run?.totalStops) && closedStops === run?.totalStops;

  return (
    <div className="route-shell flex min-h-full min-w-0 flex-col bg-bg-main">
      <header className="border-b border-sand bg-bg-card px-4 py-4 sm:rounded-t-2xl sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link
            href="/wholesale/routes"
            className="route-secondary h-12 w-12 shrink-0 px-0"
            aria-label="Quay lại quản lý tuyến"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="route-number text-xs font-bold text-text-muted">{businessDate}</p>
            <h1 className="truncate font-display text-2xl font-bold text-navy">Tuyến hôm nay</h1>
          </div>
          <button
            type="button"
            className="route-secondary h-12 w-12 shrink-0 px-0"
            aria-label="Làm mới chuyến"
            disabled={loading}
            onClick={() => void loadContext()}
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-4xl flex-1 content-start gap-5 px-4 py-5 sm:px-6">
        {context && context.runs.length > 1 && (
          <label className="grid gap-2 text-sm font-bold">
            Chuyến đang xem
            <select
              className="route-control"
              value={selectedRunId}
              onChange={(event) => void handleRunSelection(event.target.value)}
            >
              {context.runs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.templateName} · {item.assignedRepName}
                </option>
              ))}
            </select>
          </label>
        )}

        {loading ? (
          <TodaySkeleton />
        ) : !run ? (
          <div className="route-card grid justify-items-start gap-3 p-6">
            <MapPin className="h-9 w-9 text-brand-600" aria-hidden="true" />
            <h2 className="font-display text-2xl font-bold text-navy">
              Chưa có chuyến hôm nay
            </h2>
            <p className="max-w-xl text-sm leading-6 text-text-muted">
              Quản lý cần phát hành chuyến từ một tuyến mẫu trước khi nhân viên bắt đầu.
            </p>
            {context?.principal.role !== "sales" && (
              <Link href="/wholesale/routes" className="route-primary">
                Mở kế hoạch tuyến
              </Link>
            )}
          </div>
        ) : (
          <>
            <section className="route-card grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-black text-navy">{run.templateName}</h2>
                  <RunStatus status={run.status} />
                </div>
                <p className="mt-1 text-sm text-text-muted">{run.assignedRepName}</p>
                <div className="mt-4 grid gap-2">
                  <div className="flex justify-between text-xs font-bold text-text-muted">
                    <span>Đã xử lý</span>
                    <span className="route-number">{closedStops}/{run.totalStops}</span>
                  </div>
                  <div className="route-progress">
                    <span
                      style={{
                        transform: `scaleX(${run.totalStops ? closedStops / run.totalStops : 0})`,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center sm:min-w-64">
                <Metric value={run.totalStops} label="Điểm" />
                <Metric value={run.completedStops} label="Đã ghé" />
                <Metric value={run.orderedStops} label="Có đơn" />
              </div>
            </section>

            <section className="grid gap-3">
              {run.stops?.map((stop, index) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={index}
                  runStatus={run.status}
                  busy={busy.startsWith(`stop:${stop.id}:`)}
                  gpsFailed={gpsFailureStopId === stop.id}
                  locationReason={locationReason}
                  skipReason={skipReasons[stop.id] ?? ""}
                  outcome={outcomes[stop.id] ?? ""}
                  note={notes[stop.id] ?? ""}
                  online={online}
                  onLocationReason={setLocationReason}
                  onSkipReason={(value) =>
                    setSkipReasons((current) => ({ ...current, [stop.id]: value }))
                  }
                  onOutcome={(value) =>
                    setOutcomes((current) => ({ ...current, [stop.id]: value }))
                  }
                  onNote={(value) =>
                    setNotes((current) => ({ ...current, [stop.id]: value }))
                  }
                  onCheckIn={() => void checkIn(stop)}
                  onCheckInWithoutGps={() => void checkIn(stop, true)}
                  onSkip={() => void skipStop(stop)}
                  onComplete={() => void completeStop(stop)}
                  onCreateOrder={() => setOrderStop(stop)}
                />
              ))}
            </section>
          </>
        )}
      </main>

      {run && ["published", "in_progress"].includes(run.status) && (
        <footer className="route-mobile-footer sticky bottom-0 border-t border-sand bg-bg-card px-4 pt-3 sm:rounded-b-2xl sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            <p className="hidden text-sm font-bold text-text-muted sm:block">
              {run.status === "published"
                ? "Bắt đầu để mở check-in."
                : canComplete
                  ? "Tất cả điểm đã được xử lý."
                  : `Còn ${run.totalStops - closedStops} điểm.`}
            </p>
            {run.status === "published" ? (
              <button
                type="button"
                className="route-primary ml-auto w-full sm:w-auto"
                disabled={Boolean(busy)}
                onClick={() => void transitionRun("in_progress")}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                Bắt đầu tuyến
              </button>
            ) : (
              <button
                type="button"
                className="route-primary ml-auto w-full sm:w-auto"
                disabled={!canComplete || Boolean(busy)}
                onClick={() => void transitionRun("completed")}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Kết thúc tuyến
              </button>
            )}
          </div>
        </footer>
      )}

      <OrderDialog
        stop={orderStop}
        runId={run?.id ?? ""}
        products={context?.products ?? []}
        onClose={() => setOrderStop(null)}
        onCreated={async () => {
          setOrderStop(null);
          if (run) await loadRun(run.id);
        }}
      />
    </div>
  );
}

function StopCard(props: {
  stop: SalesRouteStop;
  index: number;
  runStatus: SalesRouteRun["status"];
  busy: boolean;
  gpsFailed: boolean;
  locationReason: string;
  skipReason: string;
  outcome: SalesRouteVisitOutcome | "";
  note: string;
  online: boolean;
  onLocationReason: (value: string) => void;
  onSkipReason: (value: string) => void;
  onOutcome: (value: SalesRouteVisitOutcome) => void;
  onNote: (value: string) => void;
  onCheckIn: () => void;
  onCheckInWithoutGps: () => void;
  onSkip: () => void;
  onComplete: () => void;
  onCreateOrder: () => void;
}) {
  const { stop } = props;
  const address = [
    stop.dealer.address,
    stop.dealer.district,
    stop.dealer.city,
  ].filter(Boolean).join(", ");
  const destination =
    stop.dealer.lat !== undefined && stop.dealer.lng !== undefined
      ? `${stop.dealer.lat},${stop.dealer.lng}`
      : address;
  const terminal = ["completed", "skipped"].includes(stop.status);

  return (
    <article className="route-card min-w-0 overflow-clip">
      <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:p-5">
        <div className="route-number grid h-10 w-10 place-items-center rounded-full border border-sand bg-bg-main text-sm font-black text-navy">
          {props.index + 1}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-black text-navy">{stop.dealer.name}</h3>
            <StopStatus status={stop.status} />
          </div>
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-text-muted">
            <MapPin className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{address}</span>
          </p>
          {stop.dealer.currentDebt > 0 && (
            <p className="route-number mt-1 flex items-center gap-2 text-sm font-bold text-text-secondary">
              <Banknote className="h-4 w-4" aria-hidden="true" />
              Công nợ {formatCurrency(stop.dealer.currentDebt)}
            </p>
          )}
        </div>
        <div className="flex gap-2 sm:justify-end">
          <a
            className="route-secondary h-11 w-11 px-0"
            href={`tel:${stop.dealer.phone}`}
            aria-label={`Gọi ${stop.dealer.name}`}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            className="route-secondary h-11 w-11 px-0"
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Dẫn đường đến ${stop.dealer.name}`}
          >
            <Navigation className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>

      {!terminal && props.runStatus === "in_progress" && (
        <div className="border-t border-sand bg-bg-main px-4 py-4 sm:px-5">
          {stop.status === "pending" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="route-primary flex-1 sm:flex-none"
                  disabled={props.busy}
                  onClick={props.onCheckIn}
                >
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                  {props.busy ? "Đang lấy vị trí…" : "Check-in"}
                </button>
                <details className="group">
                  <summary className="route-secondary cursor-pointer list-none">
                    <SkipForward className="h-4 w-4" aria-hidden="true" />
                    Bỏ qua
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </summary>
                  <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      className="route-control w-full"
                      maxLength={500}
                      value={props.skipReason}
                      onChange={(event) => props.onSkipReason(event.target.value)}
                      placeholder="Lý do bỏ qua"
                      aria-label="Lý do bỏ qua điểm ghé"
                    />
                    <button
                      type="button"
                      className="route-secondary"
                      disabled={!props.skipReason.trim() || props.busy}
                      onClick={props.onSkip}
                    >
                      Xác nhận bỏ qua
                    </button>
                  </div>
                </details>
              </div>
              {props.gpsFailed && (
                <div className="grid gap-2 rounded-xl border border-sand bg-bg-card p-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-text-secondary">
                    <WifiOff className="h-4 w-4" aria-hidden="true" />
                    Không lấy được GPS. Nhập lý do để tiếp tục.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      className="route-control w-full"
                      maxLength={500}
                      value={props.locationReason}
                      onChange={(event) => props.onLocationReason(event.target.value)}
                      placeholder="Ví dụ: đang ở trong toà nhà"
                    />
                    <button
                      type="button"
                      className="route-secondary"
                      disabled={!props.locationReason.trim() || props.busy}
                      onClick={props.onCheckInWithoutGps}
                    >
                      Check-in không GPS
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="route-primary"
                  disabled={!props.online || Boolean(stop.orderId)}
                  title={!props.online ? "Tạo đơn cần kết nối mạng" : undefined}
                  onClick={props.onCreateOrder}
                >
                  <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                  {stop.orderId ? `Đơn ${stop.orderNumber}` : "Tạo đơn sỉ"}
                </button>
                {!props.online && (
                  <span className="flex items-center gap-1 text-xs font-bold text-text-muted">
                    <WifiOff className="h-4 w-4" aria-hidden="true" />
                    Tạo đơn cần mạng
                  </span>
                )}
              </div>
              {!stop.orderId && (
                <label className="grid gap-2 text-sm font-bold">
                  Kết quả lượt ghé
                  <select
                    className="route-control"
                    value={props.outcome}
                    onChange={(event) =>
                      props.onOutcome(event.target.value as SalesRouteVisitOutcome)
                    }
                  >
                    <option value="">Chọn kết quả</option>
                    {OUTCOMES.map((outcome) => (
                      <option key={outcome.value} value={outcome.value}>
                        {outcome.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="grid gap-2 text-sm font-bold">
                Ghi chú
                <textarea
                  className="route-control min-h-24 resize-y"
                  maxLength={2_000}
                  value={props.note}
                  onChange={(event) => props.onNote(event.target.value)}
                  placeholder="Nhu cầu, phản hồi hoặc thời điểm hẹn lại"
                />
              </label>
              <button
                type="button"
                className="route-secondary w-full sm:w-fit"
                disabled={props.busy || (!stop.orderId && !props.outcome)}
                onClick={props.onComplete}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Hoàn tất điểm ghé
              </button>
            </div>
          )}
        </div>
      )}

      {terminal && (
        <div className="border-t border-sand px-4 py-3 text-sm text-text-muted sm:px-5">
          {stop.status === "skipped"
            ? `Đã bỏ qua · ${stop.skipReason}`
            : stop.orderId
              ? `Đã hoàn tất · đơn ${stop.orderNumber}`
              : `Đã hoàn tất · ${outcomeLabel(stop.outcome)}`}
        </div>
      )}
    </article>
  );
}

function OrderDialog(props: {
  stop: SalesRouteStop | null;
  runId: string;
  products: WholesaleProduct[];
  onClose: () => void;
  onCreated: (order: Order) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const idempotencyKeyRef = useRef("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (props.stop && dialog && !dialog.open) {
      setQuantities({});
      setNote("");
      idempotencyKeyRef.current = getOrCreateRouteOrderKey(
        props.runId,
        props.stop.id,
      );
      dialog.showModal();
    } else if (!props.stop && dialog?.open) {
      dialog.close();
    }
  }, [props.runId, props.stop]);

  const availableProducts = props.products.filter(
    (product) => product.isAvailable && product.stock > 0,
  );
  const total = availableProducts.reduce(
    (sum, product) =>
      sum + (quantities[product.id] ?? 0) * product.wholesalePrice,
    0,
  );

  async function createOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!props.stop) return;
    const lines = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([wholesaleProductId, quantity]) => ({ wholesaleProductId, quantity }));
    if (!lines.length) {
      toast.error("Hãy chọn ít nhất một sản phẩm.");
      return;
    }
    const invalidLine = lines.find((line) => {
      const product = props.products.find(
        (candidate) => candidate.id === line.wholesaleProductId,
      );
      return (
        !product ||
        !Number.isInteger(line.quantity) ||
        line.quantity < product.minimumOrderQuantity ||
        line.quantity > product.stock
      );
    });
    if (invalidLine) {
      toast.error("Số lượng phải đạt mức tối thiểu và không vượt tồn kho.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        `/api/wholesale/field-routes/${encodeURIComponent(props.runId)}/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stopId: props.stop.id,
            lines,
            note,
            idempotencyKey: idempotencyKeyRef.current,
          }),
        },
      );
      const data = await readJson(response);
      clearRouteOrderKey(props.runId, props.stop.id);
      await props.onCreated(data.order);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo đơn sỉ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="route-dialog"
      onClose={props.onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) props.onClose();
      }}
    >
      <form className="grid min-h-0" onSubmit={createOrder}>
        <header className="route-dialog-header sticky top-0 flex items-center justify-between gap-4 border-b border-sand bg-bg-card p-5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-brand-600">Đơn sỉ tại điểm ghé</p>
            <h2 className="truncate font-display text-2xl font-bold text-navy">
              {props.stop?.dealer.name}
            </h2>
          </div>
          <button
            type="button"
            className="route-secondary h-11 w-11 shrink-0 px-0"
            aria-label="Đóng tạo đơn"
            onClick={props.onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-3 p-5">
          {!availableProducts.length ? (
            <p className="text-sm text-text-muted">
              Chưa có sản phẩm sỉ đang bán và còn tồn.
            </p>
          ) : (
            availableProducts.map((product) => {
              const quantity = quantities[product.id] ?? 0;
              return (
                <label
                  key={product.id}
                  className="grid gap-3 border-b border-sand pb-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center"
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm text-navy">
                      {product.productName}
                    </strong>
                    <span className="route-number mt-1 block text-xs text-text-muted">
                      {formatCurrency(product.wholesalePrice)} /{" "}
                      {product.sellUnitLabel || "đơn vị"} · tối thiểu{" "}
                      {product.minimumOrderQuantity} · bước{" "}
                      {product.orderIncrement ?? 1} · tồn {product.stock}
                    </span>
                  </span>
                  <input
                    type="number"
                    className="route-control route-number w-full"
                    min={0}
                    max={product.stock}
                    step={1}
                    value={quantity}
                    aria-label={`Số lượng ${product.productName}`}
                    onChange={(event) =>
                      setQuantities((current) => ({
                        ...current,
                        [product.id]: Math.min(
                          product.stock,
                          Math.max(0, Math.floor(Number(event.target.value) || 0)),
                        ),
                      }))
                    }
                  />
                </label>
              );
            })
          )}
          <label className="grid gap-2 text-sm font-bold">
            Ghi chú đơn
            <textarea
              className="route-control min-h-24 resize-y"
              maxLength={2_000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Thời gian giao hoặc yêu cầu của đại lý"
            />
          </label>
        </div>

        <footer className="route-mobile-footer sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-sand bg-bg-card p-5">
          <div>
            <span className="block text-xs font-bold text-text-muted">Tạm tính niêm yết</span>
            <strong className="route-number text-lg text-navy">{formatCurrency(total)}</strong>
          </div>
          <button
            type="submit"
            className="route-primary"
            disabled={saving || !availableProducts.length}
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            {saving ? "Đang tạo…" : "Tạo đơn"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function RunStatus({ status }: { status: SalesRouteRun["status"] }) {
  const label = {
    draft: "Nháp",
    published: "Chờ bắt đầu",
    in_progress: "Đang đi",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  }[status];
  return (
    <span
      className="route-status"
      data-tone={status === "completed" ? "success" : status === "in_progress" ? "active" : "neutral"}
    >
      {status === "in_progress" ? (
        <LocateFixed className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Circle className="h-3 w-3" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

function StopStatus({ status }: { status: SalesRouteStop["status"] }) {
  const labels = {
    pending: "Chưa ghé",
    arrived: "Đã check-in",
    completed: "Hoàn tất",
    skipped: "Bỏ qua",
  };
  return (
    <span
      className="route-status"
      data-tone={status === "completed" ? "success" : status === "arrived" ? "active" : "neutral"}
    >
      {status === "completed" ? (
        <Check className="h-3 w-3" aria-hidden="true" />
      ) : status === "arrived" ? (
        <LocateFixed className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Store className="h-3 w-3" aria-hidden="true" />
      )}
      {labels[status]}
    </span>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong className="route-number block text-xl font-black text-navy">{value}</strong>
      <span className="text-xs font-bold text-text-muted">{label}</span>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="grid gap-3" aria-label="Đang tải tuyến hôm nay">
      <div className="route-card h-32 animate-pulse bg-bg-soft" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="route-card h-40 animate-pulse bg-bg-soft" />
      ))}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function outcomeLabel(outcome?: SalesRouteVisitOutcome) {
  if (outcome === "ordered") return "có đơn";
  return OUTCOMES.find((item) => item.value === outcome)?.label ?? "đã ghi nhận";
}
