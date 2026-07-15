"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Clock3 } from "lucide-react";

import { formatNumber } from "./rewards-format";
import type { MyRewardsData } from "./types";

type Filter = "all" | "earned" | "spent";
const filters = [["all", "Tất cả"], ["earned", "Đã cộng"], ["spent", "Đã dùng"]] as const;

export function PointHistory({ entries }: { entries: MyRewardsData["pointHistory"] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = entries.filter((entry) => filter === "all" || (filter === "earned" ? entry.points > 0 : entry.points < 0));
  return <section><div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-black">Lịch sử điểm</h2><p className="mt-1 text-[11px] text-[#7b6254]">Các giao dịch điểm gần đây</p></div><div className="flex gap-1">{filters.map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id)} className={`h-7 rounded-full px-2.5 text-[9px] font-bold ${filter === id ? "bg-[#c35847] text-white" : "bg-[#fff3df] text-[#7b6254]"}`}>{label}</button>)}</div></div>
    <div className="mt-3 divide-y divide-[#e9dfd8]">{filtered.length ? filtered.map((entry) => <article key={entry.id} className="flex items-center gap-2.5 py-3"><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${entry.points >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{entry.points >= 0 ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}</div><div className="min-w-0 flex-1"><h3 className="truncate text-xs font-bold">{entry.description}</h3><p className="mt-0.5 text-[9px] text-[#9b8072]">{new Date(entry.createdAt).toLocaleDateString("vi-VN")} {entry.referenceId ? `· ${entry.referenceId}` : ""}</p></div><strong className={`text-xs ${entry.points >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{entry.points >= 0 ? "+" : ""}{formatNumber(entry.points)}</strong></article>) : <div className="py-10 text-center"><Clock3 className="mx-auto h-6 w-6 text-[#c9aca0]" /><p className="mt-2 text-xs text-[#806354]">Chưa có giao dịch phù hợp</p></div>}</div>
  </section>;
}
