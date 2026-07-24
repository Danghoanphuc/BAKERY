"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, BadgeDollarSign, BarChart3, FlaskConical, Gift, Layers3, Loader2, Plus, RefreshCw, Save, Sparkles, Target, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import type { LoyaltyAuditEntry, LoyaltyPointLedgerEntry, LoyaltyProgramVersion, LoyaltyReward, LoyaltyRule, LoyaltySegment, MarketingSettings, TierSetting } from "@/types";

type Workspace = {
  settings: MarketingSettings;
  rules: LoyaltyRule[];
  rewards: LoyaltyReward[];
  segments: LoyaltySegment[];
  versions: LoyaltyProgramVersion[];
  audit: LoyaltyAuditEntry[];
  ledger: LoyaltyPointLedgerEntry[];
  stats: { members: number; activeMembers: number; outstandingPoints: number; estimatedLiability: number; completedOrders: number; memberRevenue: number; tierDistribution: Array<{ id: string; name: string; count: number }> };
};

const tabs = [
  ["overview", "Tổng quan", BarChart3], ["rules", "Luật tích điểm", Sparkles],
  ["tiers", "Hạng thành viên", Layers3], ["rewards", "Kho phần thưởng", Gift],
  ["segments", "Phân khúc", Target], ["simulator", "Mô phỏng", FlaskConical],
  ["versions", "Phiên bản", RefreshCw],
] as const;

export default function LoyaltyWorkspacePage() {
  const [data, setData] = useState<Workspace | null>(null);
  const [draft, setDraft] = useState<MarketingSettings | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("overview");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/wholesale/loyalty", { cache: "no-store" });
    if (!response.ok) return;
    const next = await response.json() as Workspace;
    setData(next); setDraft(next.settings);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function saveSettings() {
    if (!draft) return;
    setBusy(true);
    const response = await fetch("/api/wholesale/loyalty", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    response.ok ? toast.success("Đã lưu cấu hình loyalty.") : toast.error("Không thể lưu cấu hình.");
    if (response.ok) await load(); setBusy(false);
  }
  async function saveEntity(kind: "rule" | "reward" | "segment", value: Record<string, unknown>) {
    setBusy(true); const response = await fetch("/api/wholesale/loyalty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save_entity", kind, value }) }); response.ok ? toast.success("Đã lưu cấu hình loyalty.") : toast.error("Không thể lưu cấu hình loyalty."); if (response.ok) await load(); setBusy(false);
  }
  async function createVersion() {
    if (!draft || !data) return;
    setBusy(true); const response = await fetch("/api/wholesale/loyalty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_version", name: `Loyalty ${new Date().toLocaleDateString("vi-VN")}`, snapshot: { settings: draft, rules: data.rules, rewards: data.rewards, segments: data.segments } }) }); response.ok ? toast.success("Đã tạo phiên bản loyalty mới.") : toast.error("Không thể tạo phiên bản loyalty."); if (response.ok) { await load(); setTab("versions"); } setBusy(false);
  }
  async function activateVersion(id: string) {
    setBusy(true); const response = await fetch("/api/wholesale/loyalty", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "activate_version", id }) }); response.ok ? toast.success("Đã kích hoạt phiên bản loyalty.") : toast.error("Không thể kích hoạt phiên bản loyalty."); if (response.ok) await load(); setBusy(false);
  }

  if (!data || !draft) return <div className="grid min-h-[420px] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-brand-600" /></div>;
  return <div className="space-y-5 pb-16">
    <header className="rounded-xl border border-[#dfe5e8] bg-[#fffdf9] px-5 py-5 shadow-[0_8px_24px_rgba(18,62,102,0.06)] sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e3f1ee] text-[#2f8d88]">
              <Gift className="h-[18px] w-[18px]" />
            </span>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#2f8d88]">Marketing · Loyalty</p>
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-[-0.025em] text-[#123e66] sm:text-3xl">Chương trình khách hàng thân thiết</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6f777b]">Quản lý luật tích điểm, hạng thành viên, phần thưởng và phiên bản đang áp dụng.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex h-11 items-center gap-2 rounded-lg border border-[#dfe5e8] bg-white px-3.5 text-sm text-[#5f686d]">
            <Activity className="h-4 w-4 text-[#2f8d88]" />
            <span><strong className="font-black text-[#123e66]">{format(data.stats.activeMembers)}</strong> đang hoạt động</span>
          </div>
          <button onClick={createVersion} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#d94a34] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[#c63f2d] disabled:cursor-not-allowed disabled:opacity-60">
            <Save className="h-4 w-4" /> Lưu thành phiên bản
          </button>
        </div>
      </div>
    </header>
    <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[#dfe5e8] bg-[#fffdf9] p-1.5 shadow-sm">{tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-black transition ${tab === id ? "bg-[#123e66] text-white shadow-sm" : "text-[#647078] hover:bg-[#eaf3f1] hover:text-[#123e66]"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
    {tab === "overview" && <Overview data={data} />}
    {tab === "rules" && <Rules rules={data.rules} onSave={(value) => saveEntity("rule", value)} busy={busy} />}
    {tab === "tiers" && <TierStudio settings={draft} onChange={setDraft} onSave={saveSettings} busy={busy} distribution={data.stats.tierDistribution} />}
    {tab === "rewards" && <Rewards rewards={data.rewards} onSave={(value) => saveEntity("reward", value)} busy={busy} />}
    {tab === "segments" && <Segments segments={data.segments} onSave={(value) => saveEntity("segment", value)} busy={busy} />}
    {tab === "simulator" && <Simulator current={data.settings} draft={draft} stats={data.stats} onChange={setDraft} />}
    {tab === "versions" && <Versions versions={data.versions} audit={data.audit} onActivate={activateVersion} busy={busy} />}
  </div>;
}

function Overview({ data }: { data: Workspace }) {
  const cards = [
    ["Thành viên", format(data.stats.members), Users], ["Đang hoạt động", format(data.stats.activeMembers), Activity],
    ["Điểm chưa dùng", format(data.stats.outstandingPoints), Sparkles], ["Nợ điểm dự kiến", money(data.stats.estimatedLiability), BadgeDollarSign],
  ] as const;
  return <div className="space-y-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><Icon className="h-6 w-6 text-[#b84a39]" /><p className="mt-4 text-sm font-bold text-neutral-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="grid gap-4 lg:grid-cols-2"><Panel title="Phân bố hạng">{data.stats.tierDistribution.map((tier) => <div key={tier.id} className="mb-3 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm"><b>{tier.name}</b><span>{tier.count} khách</span></div>)}</Panel><Panel title="Hoạt động gần đây">{data.audit.length ? data.audit.slice(0, 8).map((item) => <div key={item.id} className="border-b border-neutral-100 py-2 text-sm last:border-0"><b>{item.action}</b><span className="ml-2 text-neutral-500">{item.entityType}</span></div>) : <Empty text="Chưa có audit log." />}</Panel></div></div>;
}

function Rules({ rules, onSave, busy }: { rules: LoyaltyRule[]; onSave: (value: Record<string, unknown>) => void; busy: boolean }) {
  const [draft, setDraft] = useState({ name: "", trigger: "order_completed", amountPerPoint: 10000, fixedPoints: 0, multiplier: 1 });
  return <Panel title="Rule Builder" action={<button onClick={() => onSave({ ...draft, enabled: true, priority: rules.length + 1 })} disabled={busy || !draft.name} className="btn-primary"><Plus className="h-4 w-4" /> Thêm luật</button>}><div className="grid gap-3 md:grid-cols-5"><Input label="Tên luật" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} /><Select label="Trigger" value={draft.trigger} onChange={(trigger) => setDraft({ ...draft, trigger })} options={[["order_completed","Đơn hoàn thành"],["first_order","Đơn đầu tiên"],["repeat_order","Mua lại"],["birthday","Sinh nhật"],["profile_completed","Hoàn thiện hồ sơ"],["off_peak","Giờ thấp điểm"]]} /><NumberInput label="₫ / điểm" value={draft.amountPerPoint} onChange={(amountPerPoint) => setDraft({ ...draft, amountPerPoint })} /><NumberInput label="Điểm thưởng" value={draft.fixedPoints} onChange={(fixedPoints) => setDraft({ ...draft, fixedPoints })} /><NumberInput label="Hệ số" value={draft.multiplier} onChange={(multiplier) => setDraft({ ...draft, multiplier })} /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{rules.map((rule) => <article key={rule.id} className="rounded-2xl border border-neutral-200 p-4"><div className="flex justify-between"><div><h3 className="font-black">{rule.name}</h3><p className="mt-1 text-xs font-bold text-neutral-500">{rule.trigger}</p></div><span className={`rounded-full px-2 py-1 text-xs font-black ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100"}`}>{rule.enabled ? "Đang bật" : "Tắt"}</span></div><p className="mt-3 text-sm">{rule.amountPerPoint ? `${money(rule.amountPerPoint)} = 1 điểm` : ""} {rule.fixedPoints ? `+${rule.fixedPoints} điểm` : ""} {rule.multiplier && rule.multiplier !== 1 ? `×${rule.multiplier}` : ""}</p></article>)}</div></Panel>;
}

function TierStudio({ settings, onChange, onSave, busy, distribution }: { settings: MarketingSettings; onChange: (value: MarketingSettings) => void; onSave: () => void; busy: boolean; distribution: Workspace["stats"]["tierDistribution"] }) {
  function patch(index: number, value: Partial<TierSetting>) { const tiers = [...settings.tiers]; tiers[index] = { ...tiers[index], ...value }; onChange({ ...settings, tiers }); }
  function addTier() { onChange({ ...settings, tiers: [...settings.tiers, { id: crypto.randomUUID(), name: "Hạng mới", threshold: 0, icon: "", imageUrl: "", benefit: "", benefits: [], maintenanceThreshold: 0, evaluationPeriodMonths: 12, gracePeriodDays: 30 }] }); }
  return <div className="space-y-4"><div className="flex justify-between"><div><h2 className="text-xl font-black">Tier Studio</h2><p className="text-sm text-neutral-500">Ảnh hạng hiển thị đồng bộ trên app khách hàng.</p></div><div className="flex gap-2"><button onClick={addTier} className="btn-secondary"><Plus className="h-4 w-4" /> Thêm hạng</button><button onClick={onSave} disabled={busy} className="btn-primary"><Save className="h-4 w-4" /> Lưu</button></div></div><div className="grid gap-4 xl:grid-cols-2">{settings.tiers.map((tier, index) => <article key={tier.id} className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[150px_1fr]"><AdminImageUploader value={tier.imageUrl} onChange={(imageUrl) => patch(index, { imageUrl })} label={`Ảnh hạng ${tier.name}`} /><div className="grid content-start gap-3 md:grid-cols-2"><Input label="Tên hạng" value={tier.name} onChange={(name) => patch(index, { name })} /><NumberInput label="Mốc lên hạng" value={tier.threshold} onChange={(threshold) => patch(index, { threshold })} /><NumberInput label="Mốc duy trì" value={tier.maintenanceThreshold ?? 0} onChange={(maintenanceThreshold) => patch(index, { maintenanceThreshold })} /><NumberInput label="Chu kỳ xét (tháng)" value={tier.evaluationPeriodMonths ?? 12} onChange={(evaluationPeriodMonths) => patch(index, { evaluationPeriodMonths })} /><Input label="Quyền lợi chính" value={tier.benefit} onChange={(benefit) => patch(index, { benefit })} /><NumberInput label="Grace period (ngày)" value={tier.gracePeriodDays ?? 30} onChange={(gracePeriodDays) => patch(index, { gracePeriodDays })} /><p className="col-span-2 rounded-xl bg-[#fff7ed] p-3 text-sm font-bold text-[#8a4a28]">{distribution.find((item) => item.id === tier.id)?.count ?? 0} khách đang ở hạng này</p></div></article>)}</div></div>;
}

function Rewards({ rewards, onSave, busy }: { rewards: LoyaltyReward[]; onSave: (value: Record<string, unknown>) => void; busy: boolean }) {
  const [draft, setDraft] = useState({ name: "", type: "voucher", pointsCost: 100, value: 10, validityDays: 30, stock: 100 });
  return <Panel title="Reward Catalog" action={<button onClick={() => onSave({ ...draft, enabled: true })} disabled={busy || !draft.name} className="btn-primary"><Plus className="h-4 w-4" /> Thêm phần thưởng</button>}><div className="grid gap-3 md:grid-cols-6"><Input label="Tên" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} /><Select label="Loại" value={draft.type} onChange={(type) => setDraft({ ...draft, type })} options={[["voucher","Voucher"],["gift","Tặng món"],["free_shipping","Freeship"],["points","Điểm"],["multiplier","Nhân điểm"]]} /><NumberInput label="Giá điểm" value={draft.pointsCost} onChange={(pointsCost) => setDraft({ ...draft, pointsCost })} /><NumberInput label="Giá trị" value={draft.value} onChange={(value) => setDraft({ ...draft, value })} /><NumberInput label="Hiệu lực ngày" value={draft.validityDays} onChange={(validityDays) => setDraft({ ...draft, validityDays })} /><NumberInput label="Tồn kho" value={draft.stock} onChange={(stock) => setDraft({ ...draft, stock })} /></div><div className="mt-5 grid gap-3 md:grid-cols-3">{rewards.map((reward) => <article key={reward.id} className="rounded-2xl border border-neutral-200 p-4"><Gift className="h-6 w-6 text-[#b84a39]" /><h3 className="mt-3 font-black">{reward.name}</h3><p className="mt-1 text-sm text-neutral-500">{reward.pointsCost} điểm · {reward.validityDays} ngày</p><p className="mt-3 text-xs font-bold">Tồn: {reward.stock ?? "Không giới hạn"}</p></article>)}</div></Panel>;
}

function Segments({ segments, onSave, busy }: { segments: LoyaltySegment[]; onSave: (value: Record<string, unknown>) => void; busy: boolean }) {
  const [draft, setDraft] = useState({ name: "", description: "", field: "days_since_order", operator: "gte", value: 30 });
  return <Panel title="Segment Intelligence" action={<button onClick={() => onSave({ name: draft.name, description: draft.description, conditions: [{ field: draft.field, operator: draft.operator, value: draft.value }] })} disabled={busy || !draft.name} className="btn-primary"><Plus className="h-4 w-4" /> Tạo phân khúc</button>}><div className="grid gap-3 md:grid-cols-5"><Input label="Tên phân khúc" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} /><Input label="Mô tả" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} /><Select label="Tín hiệu" value={draft.field} onChange={(field) => setDraft({ ...draft, field })} options={[["days_since_order","Ngày chưa quay lại"],["points","Điểm"],["order_count","Số đơn"],["lifetime_value","Tổng chi tiêu"]]} /><Select label="Điều kiện" value={draft.operator} onChange={(operator) => setDraft({ ...draft, operator })} options={[["gte","Lớn hơn hoặc bằng"],["lte","Nhỏ hơn hoặc bằng"],["eq","Bằng"]]} /><NumberInput label="Giá trị" value={draft.value} onChange={(value) => setDraft({ ...draft, value })} /></div><div className="mt-5 grid gap-3 md:grid-cols-2">{segments.map((segment) => <article key={segment.id} className="rounded-2xl border border-neutral-200 p-4"><Target className="h-6 w-6 text-[#b84a39]" /><h3 className="mt-2 font-black">{segment.name}</h3><p className="mt-1 text-sm text-neutral-500">{segment.description}</p><p className="mt-3 text-xs font-bold">{segment.conditions.map((condition) => `${condition.field} ${condition.operator} ${condition.value}`).join(" · ")}</p></article>)}</div></Panel>;
}

function Simulator({ current, draft, stats, onChange }: { current: MarketingSettings; draft: MarketingSettings; stats: Workspace["stats"]; onChange: (value: MarketingSettings) => void }) {
  const ratio = current.pointsPerAmount / Math.max(1, draft.pointsPerAmount);
  const projectedPoints = Math.round(stats.outstandingPoints * ratio);
  return <Panel title="Loyalty Simulator"><div className="grid gap-4 lg:grid-cols-[320px_1fr]"><div><NumberInput label="Thử số tiền đổi 1 điểm" value={draft.pointsPerAmount} onChange={(pointsPerAmount) => onChange({ ...draft, pointsPerAmount })} /><p className="mt-3 text-xs leading-5 text-neutral-500">Mô phỏng dùng dữ liệu hiện tại để ước lượng mức phát hành và nghĩa vụ điểm. Không thay đổi chương trình đang chạy.</p></div><div className="grid gap-3 md:grid-cols-3"><SimulationCard label="Điểm lưu hành" before={format(stats.outstandingPoints)} after={format(projectedPoints)} /><SimulationCard label="Thay đổi phát hành" before="Hiện tại" after={`${Math.round((ratio - 1) * 100)}%`} /><SimulationCard label="Nợ điểm dự kiến" before={money(stats.estimatedLiability)} after={money(stats.estimatedLiability * ratio)} /></div></div></Panel>;
}

function Versions({ versions, audit, onActivate, busy }: { versions: LoyaltyProgramVersion[]; audit: LoyaltyAuditEntry[]; onActivate: (id: string) => void; busy: boolean }) {
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Phiên bản chương trình">{versions.length ? versions.map((version) => <article key={version.id} className="mb-3 flex items-center gap-3 rounded-xl border border-neutral-200 p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-100 font-black">v{version.version}</span><div className="min-w-0 flex-1"><h3 className="truncate font-black">{version.name}</h3><p className="text-xs text-neutral-500">{version.status}</p></div>{version.status !== "active" && <button onClick={() => onActivate(version.id)} disabled={busy} className="btn-secondary">Kích hoạt</button>}</article>) : <Empty text="Chưa có phiên bản." />}</Panel><Panel title="Audit log">{audit.length ? audit.map((item) => <div key={item.id} className="border-b py-2 text-sm"><b>{item.action}</b><span className="ml-2 text-neutral-500">{item.entityType}</span></div>) : <Empty text="Chưa có thay đổi." />}</Panel></div>;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-black">{title}</h2>{action}</div>{children}</section>; }
function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-black text-neutral-600">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-[#b84a39]" /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-xs font-black text-neutral-600">{label}<input type="number" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm font-semibold outline-none focus:border-[#b84a39]" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string,string])[] }) { return <label className="block text-xs font-black text-neutral-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-2 text-sm font-semibold">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function SimulationCard({ label, before, after }: { label: string; before: string; after: string }) { return <div className="rounded-2xl bg-[#fff7ed] p-4"><p className="text-xs font-bold text-neutral-500">{label}</p><p className="mt-2 text-sm text-neutral-400 line-through">{before}</p><p className="mt-1 text-xl font-black text-[#b84a39]">{after}</p></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm font-semibold text-neutral-500">{text}</p>; }
function format(value: number) { return new Intl.NumberFormat("vi-VN").format(value); }
function money(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }
