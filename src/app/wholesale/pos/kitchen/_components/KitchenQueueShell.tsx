"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChefHat, Clock3, LoaderCircle, Play, Utensils } from "lucide-react";
import { clsx } from "clsx";
import { toast } from "sonner";
import type { PosKitchenTicket, PosTableRoundStatus } from "@/types/pos-table";

const COLUMNS: Array<{
  status: Exclude<PosTableRoundStatus, "served">;
  label: string;
  tone: string;
  action: string;
  next: PosTableRoundStatus;
}> = [
  { status: "queued", label: "Món mới", tone: "border-amber-200 bg-amber-50", action: "Bắt đầu làm", next: "preparing" },
  { status: "preparing", label: "Đang làm", tone: "border-blue-200 bg-blue-50", action: "Báo sẵn sàng", next: "ready" },
  { status: "ready", label: "Sẵn sàng giao", tone: "border-emerald-200 bg-emerald-50", action: "Đã giao khách", next: "served" },
];

export function KitchenQueueShell() {
  const [tickets, setTickets] = useState<PosKitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string>();
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const response = await fetch("/api/wholesale/pos/table-service?mode=kitchen", { cache: "no-store" });
    const data = (await response.json()) as { tickets?: PosKitchenTicket[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Không thể tải hàng chờ bếp.");
    setTickets(data.tickets ?? []);
  }, []);

  useEffect(() => {
    void load()
      .catch((error) => toast.error(error instanceof Error ? error.message : "Không thể tải bếp."))
      .finally(() => setLoading(false));
    const refresh = window.setInterval(() => void load().catch(() => undefined), 5_000);
    const clock = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [load]);

  const counts = useMemo(
    () => Object.fromEntries(COLUMNS.map((column) => [column.status, tickets.filter((ticket) => (ticket.round.status ?? "queued") === column.status).length])),
    [tickets, tick],
  );

  async function moveTicket(ticket: PosKitchenTicket, status: PosTableRoundStatus) {
    const key = `${ticket.tabId}-${ticket.round.id}`;
    setWorkingId(key);
    try {
      const response = await fetch("/api/wholesale/pos/table-service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_round_status",
          tabId: ticket.tabId,
          roundId: ticket.round.id,
          status,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể cập nhật món.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật món.");
      await load().catch(() => undefined);
    } finally {
      setWorkingId(undefined);
    }
  }

  return (
    <div className="mx-auto min-h-full max-w-7xl bg-[#f5f2ed] text-[#30241e] sm:min-h-[calc(100vh-3rem)] sm:rounded-3xl sm:border sm:border-[#e5ddd5] sm:shadow-sm">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#e5ddd5] bg-[#fffdf9]/95 px-4 py-4 backdrop-blur sm:rounded-t-3xl sm:px-6">
        <Link href="/wholesale/pos/tables" className="grid h-11 w-11 place-items-center rounded-2xl border border-[#e2d7cd] bg-white" aria-label="Quay lại bàn">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#a94b3a]">Kitchen display</p>
          <h1 className="truncate text-xl font-black">Hàng chờ bếp</h1>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-[#f0e8e1] px-3 py-2 text-xs font-black text-[#655248]">
          <ChefHat className="h-4 w-4" /> {tickets.length} lượt
        </span>
      </header>

      {loading ? (
        <div className="grid min-h-96 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-[#8a756a]" /></div>
      ) : (
        <main className="grid gap-4 p-4 lg:grid-cols-3 lg:p-6">
          {COLUMNS.map((column) => {
            const columnTickets = tickets.filter((ticket) => (ticket.round.status ?? "queued") === column.status);
            return (
              <section key={column.status} className="min-w-0">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-sm font-black uppercase tracking-[0.12em]">{column.label}</h2>
                  <span className="grid h-7 min-w-7 place-items-center rounded-full bg-white px-2 text-xs font-black shadow-sm">{counts[column.status] ?? 0}</span>
                </div>
                <div className="space-y-3">
                  {columnTickets.length === 0 ? (
                    <div className="grid min-h-28 place-items-center rounded-3xl border border-dashed border-[#d8cdc4] bg-white/60 text-xs font-bold text-[#99877d]">Không có lượt món</div>
                  ) : columnTickets.map((ticket) => {
                    const key = `${ticket.tabId}-${ticket.round.id}`;
                    return (
                      <article key={key} className={clsx("overflow-hidden rounded-3xl border shadow-sm", column.tone)}>
                        <div className="flex items-start justify-between border-b border-black/5 px-4 py-3">
                          <div>
                            <h3 className="text-xl font-black">{ticket.tableName}</h3>
                            <p className="mt-0.5 text-xs font-bold opacity-65">Lượt {ticket.round.number}</p>
                          </div>
                          <span className="flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[11px] font-black">
                            <Clock3 className="h-3 w-3" /> {elapsed(ticket.round.sentAt)}
                          </span>
                        </div>
                        <div className="divide-y divide-black/5 bg-white/55 px-4">
                          {ticket.round.items.map((item) => (
                            <div key={item.cartItemId} className="flex gap-3 py-3">
                              <span className="grid h-8 min-w-8 place-items-center rounded-xl bg-white text-sm font-black shadow-sm">{item.quantity}</span>
                              <div className="min-w-0">
                                <p className="font-black">{item.productName}</p>
                                {(item.selectedSizeLabel || item.selectedFlavorLabel || item.customMessage) && (
                                  <p className="mt-0.5 text-xs font-bold opacity-65">{[item.selectedSizeLabel, item.selectedFlavorLabel, item.customMessage].filter(Boolean).join(" · ")}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {ticket.round.note && <p className="mx-4 mt-3 rounded-2xl bg-white/75 px-3 py-2 text-xs font-black text-[#7a4438]">Ghi chú: {ticket.round.note}</p>}
                        <div className="p-4">
                          <button
                            type="button"
                            disabled={workingId === key}
                            onClick={() => void moveTicket(ticket, column.next)}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#304f39] text-sm font-black text-white disabled:opacity-60"
                          >
                            {workingId === key ? <LoaderCircle className="h-4 w-4 animate-spin" /> : column.next === "served" ? <Check className="h-4 w-4" /> : column.next === "preparing" ? <Play className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                            {column.action}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>
      )}
    </div>
  );
}

function elapsed(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)}g ${minutes % 60}p`;
}
