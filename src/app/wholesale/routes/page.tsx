"use client";

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */

import "@/features/wholesale-routes/route-operations.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  ClipboardList,
  MapPinned,
  Plus,
  RefreshCw,
  Route,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  Dealer,
  SalesRouteRun,
  SalesRouteTemplate,
  WholesaleProduct,
} from "@/types";
import type { AdminPrincipal } from "@/lib/auth/admin-rbac";

type StaffMember = Pick<AdminPrincipal, "id" | "name" | "role">;

type RouteContext = {
  principal: AdminPrincipal;
  businessDate: string;
  templates: SalesRouteTemplate[];
  runs: SalesRouteRun[];
  dealers: Dealer[];
  products: WholesaleProduct[];
  staff: StaffMember[];
};

const DAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function localBusinessDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

async function readJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Không thể hoàn tất thao tác.");
  return data;
}

export default function SalesRoutesPage() {
  const [businessDate, setBusinessDate] = useState(localBusinessDate);
  const [context, setContext] = useState<RouteContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assignedRepId, setAssignedRepId] = useState("");
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [dealerIds, setDealerIds] = useState<string[]>([]);
  const [dealerQuery, setDealerQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const loadContext = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/wholesale/field-routes?date=${encodeURIComponent(businessDate)}`,
        { cache: "no-store" },
      );
      const data = await readJson(response) as RouteContext;
      if (data.principal.role === "sales") {
        window.location.replace("/wholesale/routes/today");
        return;
      }
      setContext(data);
      setAssignedRepId((current) => current || data.staff[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải dữ liệu đi tuyến.");
    } finally {
      setLoading(false);
    }
  }, [businessDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadContext(), 0);
    return () => window.clearTimeout(timer);
  }, [loadContext]);

  useEffect(() => {
    if (!formOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setFormOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [formOpen, saving]);

  const filteredDealers = useMemo(() => {
    const query = dealerQuery.trim().toLocaleLowerCase("vi");
    if (!query) return context?.dealers ?? [];
    return (context?.dealers ?? []).filter((dealer) =>
      [dealer.name, dealer.phone, dealer.district, dealer.city]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(query),
    );
  }, [context?.dealers, dealerQuery]);

  const selectedDealers = useMemo(
    () =>
      dealerIds
        .map((dealerId) => context?.dealers.find((dealer) => dealer.id === dealerId))
        .filter((dealer): dealer is Dealer => Boolean(dealer)),
    [context?.dealers, dealerIds],
  );

  function toggleDay(day: number) {
    setScheduleDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  }

  function toggleDealer(dealerId: string) {
    setDealerIds((current) =>
      current.includes(dealerId)
        ? current.filter((item) => item !== dealerId)
        : [...current, dealerId],
    );
  }

  function moveDealer(dealerId: string, direction: -1 | 1) {
    setDealerIds((current) => {
      const from = current.indexOf(dealerId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function resetTemplateForm() {
    setName("");
    setDescription("");
    setScheduleDays([]);
    setDealerIds([]);
    setDealerQuery("");
  }

  async function createTemplate(event: React.FormEvent) {
    event.preventDefault();
    const rep = context?.staff.find((item) => item.id === assignedRepId);
    if (!rep) {
      toast.error("Hãy chọn nhân viên phụ trách.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/wholesale/field-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_template",
          template: {
            name,
            description,
            assignedRepId: rep.id,
            assignedRepName: rep.name,
            scheduleDays,
            dealerIds,
          },
        }),
      });
      await readJson(response);
      resetTemplateForm();
      setFormOpen(false);
      await loadContext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tạo tuyến.");
    } finally {
      setSaving(false);
    }
  }

  async function createRun(templateId: string) {
    setSaving(true);
    try {
      const response = await fetch("/api/wholesale/field-routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_run",
          templateId,
          businessDate,
        }),
      });
      await readJson(response);
      await loadContext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể phát hành chuyến.");
    } finally {
      setSaving(false);
    }
  }

  const completedStops =
    context?.runs.reduce((sum, run) => sum + run.completedStops, 0) ?? 0;
  const totalStops =
    context?.runs.reduce((sum, run) => sum + run.totalStops, 0) ?? 0;
  const orderedStops =
    context?.runs.reduce((sum, run) => sum + run.orderedStops, 0) ?? 0;

  return (
    <div className="route-shell grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 pb-10 sm:gap-6">
      <header className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 border-b border-sand pb-5 sm:pb-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-bold text-brand-600">
            <MapPinned className="h-4 w-4" aria-hidden="true" />
            Vận hành bán sỉ
          </div>
          <h1 className="mt-1 min-w-0 font-display text-2xl font-bold text-navy [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl">
            Kế hoạch đi tuyến
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted sm:text-base sm:leading-7">
            Chọn ngày, phát hành chuyến và theo dõi tiến độ tại một nơi.
          </p>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(11rem,1fr)_auto] xl:min-w-[25rem]">
          <label className="grid min-w-0 gap-1 text-sm font-bold text-text-secondary">
            Ngày vận hành
            <input
              type="date"
              className="route-control route-number w-full min-w-0"
              value={businessDate}
              onChange={(event) => setBusinessDate(event.target.value)}
            />
          </label>
          <Link href="/wholesale/routes/today" className="route-primary self-end">
            Tuyến hôm nay
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section
        className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4"
        aria-label="Tóm tắt chuyến đi"
      >
        <Summary label="Chuyến" value={context?.runs.length ?? 0} icon={Route} />
        <Summary label="Điểm ghé" value={totalStops} icon={MapPinned} />
        <Summary label="Đã xử lý" value={completedStops} icon={Check} />
        <Summary label="Có đơn" value={orderedStops} icon={ClipboardList} />
      </section>

      <main className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-navy sm:text-2xl">Chuyến trong ngày</h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">
              Mỗi tuyến mẫu chỉ phát hành một chuyến cho ngày đang chọn.
            </p>
          </div>
          <div className="grid gap-2 sm:flex">
            <button
              type="button"
              className="route-secondary px-3"
              disabled={loading}
              onClick={() => void loadContext()}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Làm mới
            </button>
            <button
              type="button"
              className="route-primary px-3"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tạo tuyến mẫu
            </button>
          </div>
        </div>

        {loading ? (
          <RouteSkeleton />
        ) : !context?.templates.length ? (
          <EmptyState
            title="Chưa có tuyến mẫu"
            description="Tạo tuyến đầu tiên, chọn người phụ trách và sắp thứ tự đại lý."
            action={
              <button type="button" className="route-primary" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Tạo tuyến
              </button>
            }
          />
        ) : (
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            {context.templates.map((template) => {
              const run = context.runs.find((item) => item.templateId === template.id);
              const handledStops = run
                ? run.completedStops + run.skippedStops
                : 0;
              return (
                <article
                  key={template.id}
                  className="route-card grid min-w-0 content-between gap-4 p-4 sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-navy">
                          {template.name}
                        </h3>
                        <p className="mt-1 truncate text-sm text-text-muted">
                          {template.assignedRepName}
                        </p>
                      </div>
                      <span className="route-status shrink-0" data-tone={run ? "active" : "neutral"}>
                        {run ? statusLabel(run.status) : "Chưa phát hành"}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-bg-soft p-3 text-sm">
                      <div className="min-w-0">
                        <dt className="text-xs font-bold text-text-muted">Điểm ghé</dt>
                        <dd className="route-number mt-1 font-black text-navy">
                          {template.stops.length}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-xs font-bold text-text-muted">Lịch định kỳ</dt>
                        <dd className="mt-1 truncate font-black text-navy">
                          {template.scheduleDays.map((day) => DAY_LABELS[day]).join(", ")}
                        </dd>
                      </div>
                    </dl>

                    {run && (
                      <div className="mt-4 grid gap-2">
                        <div className="flex justify-between text-xs font-bold text-text-muted">
                          <span>Đã xử lý</span>
                          <span className="route-number">
                            {handledStops}/{run.totalStops}
                          </span>
                        </div>
                        <div className="route-progress">
                          <span
                            style={{
                              transform: `scaleX(${run.totalStops ? handledStops / run.totalStops : 0})`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {run ? (
                    <Link
                      href={`/wholesale/routes/today?run=${encodeURIComponent(run.id)}`}
                      className="route-secondary w-full"
                    >
                      Mở chuyến
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="route-primary w-full"
                      disabled={saving}
                      onClick={() => void createRun(template.id)}
                    >
                      Phát hành cho ngày này
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {formOpen && (
        <div className="route-overlay" role="presentation">
          <button
            type="button"
            className="route-overlay-dismiss"
            aria-label="Đóng form tạo tuyến"
            onClick={() => {
              if (!saving) setFormOpen(false);
            }}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-route-title"
            className="route-template-drawer"
          >
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={createTemplate}>
              <header className="route-dialog-header flex items-start justify-between gap-4 border-b border-sand bg-bg-card p-4 sm:p-5">
                <div className="min-w-0">
                  <h2 id="create-route-title" className="font-display text-2xl font-bold text-navy">
                    Tạo tuyến mẫu
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    Chọn điểm ghé rồi sắp đúng thứ tự di chuyển.
                  </p>
                </div>
                <button
                  type="button"
                  className="route-secondary h-11 w-11 shrink-0 px-0"
                  aria-label="Đóng"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </header>

              <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(18rem,1.2fr)]">
                <div className="grid content-start gap-4">
                  <label className="grid gap-2 text-sm font-bold">
                    Tên tuyến
                    <input
                      required
                      autoFocus
                      className="route-control"
                      maxLength={120}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ví dụ: Quận 7 — sáng thứ ba"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-bold">
                    Nhân viên phụ trách
                    <select
                      required
                      className="route-control"
                      value={assignedRepId}
                      onChange={(event) => setAssignedRepId(event.target.value)}
                    >
                      <option value="">Chọn nhân viên</option>
                      {context?.staff.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} · {staff.role}
                        </option>
                      ))}
                    </select>
                  </label>

                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-bold">Ngày chạy định kỳ</legend>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {DAY_LABELS.map((label, day) => (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={scheduleDays.includes(day)}
                          onClick={() => toggleDay(day)}
                          className={
                            scheduleDays.includes(day)
                              ? "route-primary px-2"
                              : "route-secondary px-2"
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <label className="grid gap-2 text-sm font-bold">
                    Ghi chú <span className="font-normal text-text-muted">(không bắt buộc)</span>
                    <textarea
                      className="route-control min-h-24 resize-y"
                      maxLength={500}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Khu vực hoặc lưu ý cho nhân viên"
                    />
                  </label>
                </div>

                <div className="grid min-w-0 content-start gap-4">
                  <fieldset className="grid min-w-0 gap-3">
                    <legend className="text-sm font-bold">Chọn đại lý</legend>
                    <label className="relative block min-w-0">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Tìm đại lý</span>
                      <input
                        type="search"
                        className="route-control w-full min-w-0 pl-10"
                        value={dealerQuery}
                        onChange={(event) => setDealerQuery(event.target.value)}
                        placeholder="Tên, số điện thoại hoặc khu vực"
                      />
                    </label>
                    <div className="max-h-60 overflow-y-auto rounded-xl border border-sand bg-bg-main p-2">
                      {filteredDealers.map((dealer) => {
                        const selectedIndex = dealerIds.indexOf(dealer.id);
                        return (
                          <label
                            key={dealer.id}
                            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-bg-soft sm:px-3"
                          >
                            <input
                              type="checkbox"
                              checked={selectedIndex >= 0}
                              disabled={selectedIndex < 0 && dealerIds.length >= 100}
                              onChange={() => toggleDealer(dealer.id)}
                              className="h-5 w-5 min-h-0 shrink-0 accent-brand-500"
                            />
                            <span className="min-w-0 flex-1">
                              <strong className="block truncate text-sm text-navy">{dealer.name}</strong>
                              <span className="block truncate text-xs text-text-muted">
                                {[dealer.district, dealer.city].filter(Boolean).join(", ")}
                              </span>
                            </span>
                            {selectedIndex >= 0 && (
                              <span className="route-number text-sm font-black text-brand-600">
                                {selectedIndex + 1}
                              </span>
                            )}
                          </label>
                        );
                      })}
                      {!filteredDealers.length && (
                        <p className="p-3 text-sm leading-6 text-text-muted">
                          Chưa có đại lý đã duyệt phù hợp.
                        </p>
                      )}
                    </div>
                  </fieldset>

                  <section className="grid min-w-0 gap-2" aria-labelledby="selected-stops-title">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="selected-stops-title" className="text-sm font-bold">
                        Thứ tự ghé
                      </h3>
                      <span className="route-number text-xs font-bold text-text-muted">
                        {selectedDealers.length}/100 điểm
                      </span>
                    </div>
                    {selectedDealers.length ? (
                      <ol className="grid max-h-64 gap-2 overflow-y-auto">
                        {selectedDealers.map((dealer, index) => (
                          <li
                            key={dealer.id}
                            className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-sand bg-bg-card p-2"
                          >
                            <span className="route-number grid h-8 w-8 place-items-center rounded-lg bg-bg-soft text-sm font-black text-brand-600">
                              {index + 1}
                            </span>
                            <span className="min-w-0 truncate text-sm font-bold text-navy">
                              {dealer.name}
                            </span>
                            <span className="flex shrink-0 gap-1">
                              <OrderButton
                                label={`Đưa ${dealer.name} lên trước`}
                                disabled={index === 0}
                                onClick={() => moveDealer(dealer.id, -1)}
                                icon={ArrowUp}
                              />
                              <OrderButton
                                label={`Đưa ${dealer.name} xuống sau`}
                                disabled={index === selectedDealers.length - 1}
                                onClick={() => moveDealer(dealer.id, 1)}
                                icon={ArrowDown}
                              />
                              <OrderButton
                                label={`Bỏ ${dealer.name}`}
                                onClick={() => toggleDealer(dealer.id)}
                                icon={Trash2}
                              />
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="rounded-xl border border-dashed border-sand p-4 text-sm leading-6 text-text-muted">
                        Chọn đại lý ở phía trên. Bạn có thể đổi thứ tự trước khi lưu.
                      </p>
                    )}
                  </section>
                </div>
              </div>

              <footer className="route-mobile-footer flex items-center justify-end gap-2 border-t border-sand bg-bg-card p-4 sm:p-5">
                <button
                  type="button"
                  className="route-secondary"
                  disabled={saving}
                  onClick={() => setFormOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !name.trim() ||
                    !assignedRepId ||
                    !scheduleDays.length ||
                    !dealerIds.length ||
                    dealerIds.length > 100
                  }
                  className="route-primary min-w-32"
                >
                  {saving ? "Đang lưu…" : "Lưu tuyến mẫu"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <article className="route-card grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 p-3 sm:gap-x-3 sm:p-4">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-bg-soft sm:h-10 sm:w-10 sm:rounded-xl">
        <Icon className="h-4 w-4 text-brand-600 sm:h-5 sm:w-5" aria-hidden="true" />
      </span>
      <strong className="route-number min-w-0 text-xl font-black text-navy sm:text-2xl">{value}</strong>
      <span className="col-span-2 block truncate text-xs font-bold text-text-muted">{label}</span>
    </article>
  );
}

function RouteSkeleton() {
  return (
    <div className="grid gap-4" aria-label="Đang tải kế hoạch">
      {[0, 1, 2].map((item) => (
        <div key={item} className="route-card h-28 animate-pulse bg-bg-soft" />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="route-card grid justify-items-start gap-2 p-5 sm:p-6">
      <MapPinned className="h-8 w-8 text-brand-600" aria-hidden="true" />
      <h3 className="font-display text-xl font-bold text-navy">{title}</h3>
      <p className="text-sm leading-6 text-text-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function OrderButton({
  label,
  disabled = false,
  onClick,
  icon: Icon,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  icon: typeof ArrowUp;
}) {
  return (
    <button
      type="button"
      className="route-order-button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

function statusLabel(status: SalesRouteRun["status"]) {
  return {
    draft: "Nháp",
    published: "Đã phát hành",
    in_progress: "Đang đi",
    completed: "Hoàn tất",
    cancelled: "Đã hủy",
  }[status];
}
