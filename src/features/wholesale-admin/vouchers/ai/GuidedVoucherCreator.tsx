"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bot, Check, ChevronDown,
  Loader2, PencilLine, RotateCcw, Send, Settings2, Sparkles, Target, X,
} from "lucide-react";
import type { MarketingDiscountType, VoucherAudience, VoucherBudgetMode, VoucherIssueMethod, VoucherUseChannel } from "@/types";
import {
  audienceLabels, buildVoucherCampaignPayload, channelLabels, defaultVoucherDraft,
  discountTypeLabels, formatCurrency, formatNumber,
  getMaxPromotionBudget, issueMethodLabels, type VoucherDraft,
} from "@/app/wholesale/vouchers/_lib/voucher-admin";
import type { VoucherAiMessage, VoucherAiMode, VoucherAiModelTier, VoucherAiResponse } from "./voucher-ai-contract";
import { applyVoucherScenario, type VoucherBusinessSnapshot, type VoucherScenario } from "./voucher-business-context";
import { VoucherCompactPreview, VoucherCustomerPreview } from "./VoucherCustomerPreview";

type StudioStage = "brief" | "strategy" | "review";

const goals = [
  { title: "Thu hút khách mới", description: "Tạo lý do đủ mạnh để khách mua lần đầu.", prompt: "Tôi muốn thu hút khách mới." },
  { title: "Kéo khách quay lại", description: "Kích hoạt nhóm khách lâu chưa mua.", prompt: "Tôi muốn kéo khách cũ quay lại." },
  { title: "Đẩy đơn giờ thấp", description: "Tăng đơn trong những khung giờ bán chậm.", prompt: "Tôi muốn tăng đơn trong khung giờ thấp điểm." },
  { title: "Giảm tồn kho", description: "Bán nhanh sản phẩm có nguy cơ tồn cuối ngày.", prompt: "Tôi muốn giảm hàng tồn và hạn chế lãng phí." },
];

const modeLabels: Record<VoucherAiMode, string> = {
  auto: "Tự động · Khuyên dùng", economy: "Nhanh và tiết kiệm", balanced: "Cân bằng", deep: "Chuyên sâu",
};
const tierLabels: Record<VoucherAiModelTier, string> = { luna: "Luna", terra: "Terra", sol: "Sol" };

export function GuidedVoucherCreator() {
  const [stage, setStage] = useState<StudioStage>("brief");
  const [draft, setDraft] = useState<VoucherDraft>(defaultVoucherDraft);
  const [pendingDraft, setPendingDraft] = useState<VoucherDraft | null>(null);
  const [pendingFields, setPendingFields] = useState<string[]>([]);
  const [messages, setMessages] = useState<VoucherAiMessage[]>([]);
  const [brief, setBrief] = useState("");
  const [command, setCommand] = useState("");
  const [mode, setMode] = useState<VoucherAiMode>("auto");
  const [lastTier, setLastTier] = useState<VoucherAiModelTier | null>(null);
  const [aiSummary, setAiSummary] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<VoucherBusinessSnapshot | null>(null);
  const [scenarios, setScenarios] = useState<VoucherScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<VoucherScenario["id"]>("balanced");
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [showData, setShowData] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBudget = useMemo(() => getMaxPromotionBudget(draft), [draft]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("campaign");
    if (!id) { setIsRestoring(false); return; }
    fetch(`/api/wholesale/vouchers/ai-workspace?campaignId=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Không thể khôi phục campaign.");
        setCampaignId(payload.campaignId); setSessionId(payload.sessionId); setDraft(payload.draft);
        setMessages(payload.messages || []); setSnapshot(payload.snapshot); setScenarios(payload.scenarios || []);
        setLastTier(payload.modelTier); setAiSummary(payload.messages?.[payload.messages.length - 1]?.content || "Campaign đã được khôi phục.");
        setStage("strategy");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Không thể khôi phục campaign."))
      .finally(() => setIsRestoring(false));
  }, []);

  async function askAi(content: string, nextDraft: VoucherDraft = draft) {
    const clean = content.trim();
    if (!clean || isThinking) return;
    const nextMessages: VoucherAiMessage[] = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages); setIsThinking(true); setError(null);
    try {
      const response = await fetch("/api/wholesale/vouchers/ai-guide", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, draft: nextDraft, mode, campaignId, sessionId }),
      });
      const payload = await response.json() as VoucherAiResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error || "AI chưa thể phân tích lúc này.");
      setPendingDraft(payload.draft); setPendingFields(payload.changedFields || []); setAiSummary(payload.message); setWarnings(payload.warnings);
      setSnapshot(payload.snapshot); setScenarios(payload.scenarios); setLastTier(payload.modelTier);
      setSelectedScenario("balanced");
      setCampaignId(payload.campaignId); setSessionId(payload.sessionId);
      setMessages([...nextMessages, { role: "assistant", content: payload.message }]);
      setStage("strategy");
      const url = new URL(window.location.href); url.searchParams.set("campaign", payload.campaignId);
      window.history.replaceState({}, "", url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI chưa thể phân tích lúc này.");
    } finally { setIsThinking(false); }
  }

  function submitBrief() { void askAi(brief || "Hãy phân tích dữ liệu và đề xuất chiến dịch voucher phù hợp nhất."); }

  function chooseGoal(prompt: string) { setBrief(prompt); void askAi(prompt); }

  function chooseScenario(scenario: VoucherScenario) {
    setSelectedScenario(scenario.id);
    setDraft(applyVoucherScenario(pendingDraft ?? draft, scenario));
    setPendingDraft(null); setPendingFields([]);
  }

  function acceptAiProposal() {
    if (!pendingDraft) return;
    setDraft(pendingDraft); setPendingDraft(null); setPendingFields([]);
  }

  function dismissAiProposal() { setPendingDraft(null); setPendingFields([]); }

  function runCommand() { const value = command; setCommand(""); void askAi(value); }

  async function save(status: "draft" | "active") {
    setIsSaving(true); setError(null);
    try {
      const response = await fetch(campaignId ? `/api/wholesale/marketing/${campaignId}` : "/api/wholesale/marketing", {
        method: campaignId ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildVoucherCampaignPayload({ ...draft, status })),
      });
      if (!response.ok) throw new Error("Chưa lưu được campaign.");
      window.location.href = "/wholesale/marketing/vouchers";
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa lưu được campaign."); }
    finally { setIsSaving(false); }
  }

  function reset() {
    setStage("brief"); setDraft(defaultVoucherDraft); setMessages([]); setBrief(""); setCommand("");
    setSnapshot(null); setScenarios([]); setCampaignId(null); setSessionId(null); setAiSummary(""); setWarnings([]); setPendingDraft(null); setPendingFields([]);
    const url = new URL(window.location.href); url.searchParams.delete("campaign"); window.history.replaceState({}, "", url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <StudioHeader stage={stage} onReset={reset} />
      {error && <Notice tone="error">{error}</Notice>}
      {isRestoring ? <LoadingScreen label="Đang khôi phục AI Campaign Studio..." /> : stage === "brief" ? (
        <BriefStage brief={brief} setBrief={setBrief} mode={mode} setMode={setMode} showAdvanced={showAdvanced} setShowAdvanced={setShowAdvanced} isThinking={isThinking} onGoal={chooseGoal} onSubmit={submitBrief} />
      ) : stage === "strategy" ? (
        <StrategyStage draft={draft} summary={aiSummary} snapshot={snapshot} scenarios={scenarios} selectedScenario={selectedScenario} warnings={warnings} tier={lastTier} isThinking={isThinking} command={command} setCommand={setCommand} onCommand={runCommand} onScenario={chooseScenario} pendingFields={pendingFields} hasPendingProposal={Boolean(pendingDraft)} onAcceptProposal={acceptAiProposal} onDismissProposal={dismissAiProposal} onShowData={() => setShowData(true)} onEdit={() => setShowEditor(true)} onReview={() => setStage("review")} />
      ) : (
        <ReviewStage draft={draft} maxBudget={maxBudget} warnings={warnings} isSaving={isSaving} onBack={() => setStage("strategy")} onEdit={() => setShowEditor(true)} onSave={save} />
      )}
      {showData && snapshot && <DataDrawer snapshot={snapshot} onClose={() => setShowData(false)} />}
      {showEditor && <EditorDrawer draft={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} onClose={() => setShowEditor(false)} />}
    </div>
  );
}

function StudioHeader({ stage, onReset }: { stage: StudioStage; onReset: () => void }) {
  const steps: Array<{ id: StudioStage; label: string }> = [{ id: "brief", label: "Mục tiêu" }, { id: "strategy", label: "Chiến lược" }, { id: "review", label: "Xem lại" }];
  const current = steps.findIndex((item) => item.id === stage);
  return <header className="flex flex-wrap items-end justify-between gap-4">
    <div><Link href="/wholesale/marketing/vouchers" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-950"><ArrowLeft className="h-4 w-4" /> Danh sách voucher</Link><h1 className="flex items-center gap-2 text-2xl font-black text-neutral-950"><Sparkles className="h-6 w-6 text-brand-500" /> AI Campaign Studio</h1></div>
    <div className="flex items-center gap-4"><div className="flex items-center gap-2">{steps.map((item, index) => <div key={item.id} className="flex items-center gap-2"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${index <= current ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-400"}`}>{index + 1}</span><span className={`hidden text-xs font-bold sm:inline ${index === current ? "text-neutral-950" : "text-neutral-400"}`}>{item.label}</span>{index < steps.length - 1 && <span className="h-px w-5 bg-neutral-200" />}</div>)}</div><button onClick={onReset} className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500" title="Làm lại"><RotateCcw className="h-4 w-4" /></button></div>
  </header>;
}

function BriefStage(props: { brief: string; setBrief: (value: string) => void; mode: VoucherAiMode; setMode: (value: VoucherAiMode) => void; showAdvanced: boolean; setShowAdvanced: (value: boolean) => void; isThinking: boolean; onGoal: (prompt: string) => void; onSubmit: () => void }) {
  return <section className="mx-auto max-w-4xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
    <div className="mx-auto max-w-2xl text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Target className="h-6 w-6" /></span><h2 className="mt-5 text-2xl font-black text-neutral-950">Hôm nay bạn muốn cải thiện điều gì?</h2><p className="mt-2 text-sm leading-6 text-neutral-500">Chọn một mục tiêu hoặc mô tả bằng ngôn ngữ tự nhiên. AI sẽ phân tích dữ liệu bán hàng trước khi đề xuất.</p></div>
    <div className="mt-8 grid gap-3 sm:grid-cols-2">{goals.map((goal) => <button key={goal.title} disabled={props.isThinking} onClick={() => props.onGoal(goal.prompt)} className="rounded-xl border border-neutral-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"><span className="font-black text-neutral-950">{goal.title}</span><span className="mt-1 block text-sm leading-5 text-neutral-500">{goal.description}</span></button>)}</div>
    <div className="mt-6"><label className="text-xs font-black uppercase tracking-wide text-neutral-500">Mô tả thêm</label><textarea value={props.brief} onChange={(event) => props.setBrief(event.target.value)} rows={4} placeholder="Ví dụ: Kéo khách đã 60 ngày chưa quay lại, ngân sách tối đa 2 triệu..." className="mt-2 w-full resize-none rounded-xl border border-neutral-200 px-4 py-3 text-sm leading-6 outline-none focus:border-brand-500" /></div>
    <button onClick={() => props.setShowAdvanced(!props.showAdvanced)} className="mt-4 flex items-center gap-2 text-xs font-bold text-neutral-500"><Settings2 className="h-4 w-4" /> Tùy chọn phân tích <ChevronDown className={`h-3 w-3 transition ${props.showAdvanced ? "rotate-180" : ""}`} /></button>
    {props.showAdvanced && <select value={props.mode} onChange={(event) => props.setMode(event.target.value as VoucherAiMode)} className="mt-3 h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold">{Object.entries(modeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
    <button disabled={props.isThinking} onClick={props.onSubmit} className="mx-auto mt-8 flex h-12 items-center gap-2 rounded-xl bg-neutral-950 px-6 text-sm font-black text-white disabled:opacity-50">{props.isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Phân tích và đề xuất</button>
  </section>;
}

function StrategyStage(props: { draft: VoucherDraft; summary: string; snapshot: VoucherBusinessSnapshot | null; scenarios: VoucherScenario[]; selectedScenario: VoucherScenario["id"]; warnings: string[]; tier: VoucherAiModelTier | null; isThinking: boolean; command: string; setCommand: (value: string) => void; onCommand: () => void; onScenario: (scenario: VoucherScenario) => void; pendingFields: string[]; hasPendingProposal: boolean; onAcceptProposal: () => void; onDismissProposal: () => void; onShowData: () => void; onEdit: () => void; onReview: () => void }) {
  return <div className="space-y-5">
    {props.snapshot && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><p className="text-sm text-blue-900"><b>Dựa trên {formatNumber(props.snapshot.completedOrders)} đơn trong {props.snapshot.periodDays} ngày</b> · AOV {formatCurrency(props.snapshot.averageOrderValue)} · {formatNumber(props.snapshot.inactiveCustomers)} khách lâu chưa quay lại</p><button onClick={props.onShowData} className="text-xs font-black text-blue-700">Xem dữ liệu AI đã dùng →</button></div>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <main className="space-y-5"><section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Bot className="h-5 w-5" /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-neutral-950">Nhận định của AI</h2>{props.tier && <span className="rounded-full bg-neutral-100 px-2 py-1 text-[10px] font-bold text-neutral-500">{tierLabels[props.tier]}</span>}</div><p className="mt-2 text-sm leading-6 text-neutral-700">{props.summary}</p></div></div></section>
      {props.hasPendingProposal && <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4"><div><p className="text-sm font-black text-violet-950">AI đang đề xuất một cấu hình mới</p><p className="mt-1 text-xs font-semibold text-violet-700">{props.pendingFields.length ? `${props.pendingFields.length} trường thay đổi` : "Hãy duyệt trước khi áp dụng vào campaign"}. AI chưa ghi đè cấu hình hiện tại.</p></div><div className="flex gap-2"><button onClick={props.onDismissProposal} className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-xs font-black text-violet-800">Bỏ qua</button><button onClick={props.onAcceptProposal} className="h-9 rounded-lg bg-violet-700 px-3 text-xs font-black text-white">Áp dụng đề xuất</button></div></section>}
      <section><div className="mb-3"><h2 className="text-lg font-black text-neutral-950">Chọn một chiến lược</h2><p className="text-sm text-neutral-500">Chuyển đổi tức thì giữa các cấu hình. AI chỉ chạy lại khi bạn gửi yêu cầu điều chỉnh.</p></div><div className="grid gap-3 md:grid-cols-3">{props.scenarios.map((scenario) => <ScenarioCard key={scenario.id} scenario={scenario} draft={props.draft} active={props.selectedScenario === scenario.id} disabled={props.isThinking} onClick={() => props.onScenario(scenario)} />)}</div></section>
      {props.warnings.length > 0 && <Notice tone="warning"><b>AI đang phản biện:</b> {props.warnings.join(" · ")}</Notice>}
      <section className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-wide text-neutral-500">Muốn điều chỉnh gì?</p><div className="mt-2 flex gap-2"><input value={props.command} onChange={(event) => props.setCommand(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") props.onCommand(); }} placeholder="Giảm ngân sách xuống 1 triệu, chỉ dùng tại quầy..." className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500" /><button disabled={!props.command.trim() || props.isThinking} onClick={props.onCommand} className="grid h-11 w-11 place-items-center rounded-lg bg-neutral-950 text-white disabled:opacity-40">{props.isThinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></section></main>
      <CampaignCard draft={props.draft} onEdit={props.onEdit} onReview={props.onReview} /></div>
  </div>;
}

function ScenarioCard({ scenario, draft, active, disabled, onClick }: { scenario: VoucherScenario; draft: VoucherDraft; active: boolean; disabled: boolean; onClick: () => void }) {
  return <button disabled={disabled} onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "border-neutral-200 bg-white hover:border-neutral-400"}`}><div className="flex items-center justify-between"><span className="font-black text-neutral-950">{scenario.label}</span>{active && <Check className="h-4 w-4 text-brand-600" />}</div><p className="mt-3 text-xl font-black text-neutral-950">{draft.discountType === "percent" ? `${scenario.discountValue}%` : formatCurrency(scenario.discountValue)}</p><p className="text-xs font-semibold text-neutral-500">tối đa {formatCurrency(scenario.maxDiscountAmount)}</p><div className="my-3 h-px bg-neutral-100" /><div className="space-y-1.5 text-xs text-neutral-600"><Row label="Lượt đổi dự kiến" value={formatNumber(scenario.expectedRedemptions)} /><Row label="Chi phí dự kiến" value={formatCurrency(scenario.expectedCost)} /><Row label="Đơn hòa vốn" value={formatNumber(scenario.breakEvenOrders)} /></div><span className={`mt-3 inline-block rounded-full px-2 py-1 text-[10px] font-black ${scenario.risk === "low" ? "bg-emerald-100 text-emerald-700" : scenario.risk === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>Rủi ro {scenario.risk === "low" ? "thấp" : scenario.risk === "high" ? "cao" : "vừa"}</span></button>;
}

function CampaignCard({ draft, onEdit, onReview }: { draft: VoucherDraft; onEdit: () => void; onReview: () => void }) {
  return <aside className="sticky top-5 self-start rounded-2xl border border-[#f0e1d2] bg-[#fffaf6] p-4 shadow-[0_12px_30px_rgba(83,38,12,0.08)]"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9e3e2f]">Khách hàng sẽ thấy</p><p className="mt-1 text-xs font-semibold text-[#8a6b5c]">Cập nhật theo chiến lược đã chọn</p></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /></div><VoucherCompactPreview draft={draft} /><div className="mt-4 rounded-xl border border-[#f0e1d2] bg-white p-4 text-sm"><Row label="Ưu đãi" value={discountText(draft)} /><div className="my-3 h-px bg-[#f3e7dc]" /><Row label="Đối tượng" value={audienceLabels[draft.audienceType]} /><div className="my-3 h-px bg-[#f3e7dc]" /><Row label="Ngân sách tối đa" value={formatCurrency(getMaxPromotionBudget(draft))} /></div><div className="mt-3 grid grid-cols-[1fr_1.25fr] gap-2"><button onClick={onEdit} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e7d5c4] bg-white text-xs font-black text-[#69483a] transition hover:border-[#c98b72]"><PencilLine className="h-4 w-4" /> Chỉnh</button><button onClick={onReview} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#b84a39] text-xs font-black text-white shadow-sm transition hover:bg-[#9e3e2f]">Xem lại <ArrowRight className="h-4 w-4" /></button></div></aside>;
}

function ReviewStage({ draft, maxBudget, warnings, isSaving, onBack, onEdit, onSave }: { draft: VoucherDraft; maxBudget: number; warnings: string[]; isSaving: boolean; onBack: () => void; onEdit: () => void; onSave: (status: "draft" | "active") => void }) {
  return <div className="space-y-5"><button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-neutral-500"><ArrowLeft className="h-4 w-4" /> Quay lại chiến lược</button><div className="grid gap-5 xl:grid-cols-[minmax(300px,0.72fr)_minmax(520px,1.28fr)]"><section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase text-brand-600">Cấu hình campaign</p><h2 className="mt-1 text-xl font-black text-neutral-950">{draft.name}</h2></div><button onClick={onEdit} className="flex items-center gap-2 text-sm font-bold text-neutral-600"><PencilLine className="h-4 w-4" /> Chỉnh</button></div><div className="mt-6 space-y-4 text-sm"><Row label="Mã voucher" value={draft.code} /><Row label="Ưu đãi" value={discountText(draft)} /><Row label="Đơn tối thiểu" value={formatCurrency(draft.minOrderValue)} /><Row label="Đối tượng" value={audienceLabels[draft.audienceType]} /><Row label="Số lượng" value={`${formatNumber(draft.issuedLimit)} voucher`} /><Row label="Ngân sách tối đa" value={formatCurrency(maxBudget)} /><Row label="Hiệu lực" value={`${draft.validDaysAfterIssue} ngày sau khi nhận`} /><Row label="Kênh dùng" value={draft.channels.map((item) => channelLabels[item]).join(", ")} /></div>{warnings.length > 0 && <div className="mt-5 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800"><AlertTriangle className="mr-1 inline h-4 w-4" /> {warnings.join(" · ")}</div>}</section><VoucherCustomerPreview draft={draft} /></div><div className="flex flex-wrap justify-end gap-3"><button disabled={isSaving} onClick={() => onSave("draft")} className="h-11 rounded-xl border border-neutral-300 bg-white px-5 text-sm font-black text-neutral-800">Lưu nháp</button><button disabled={isSaving} onClick={() => onSave("active")} className="flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-6 text-sm font-black text-white disabled:opacity-50">{isSaving && <Loader2 className="h-4 w-4 animate-spin" />} Phát hành campaign</button></div></div>;
}

function DataDrawer({ snapshot, onClose }: { snapshot: VoucherBusinessSnapshot; onClose: () => void }) {
  return <Drawer title="Dữ liệu AI đã sử dụng" onClose={onClose}><div className="grid grid-cols-2 gap-3"><Metric label="Đơn hoàn tất" value={formatNumber(snapshot.completedOrders)} /><Metric label="Doanh thu" value={formatCurrency(snapshot.revenue)} /><Metric label="Đơn trung bình" value={formatCurrency(snapshot.averageOrderValue)} /><Metric label="Biên LN ước tính" value={`${snapshot.estimatedGrossMarginPercent}%`} /><Metric label="Khách mới" value={formatNumber(snapshot.newCustomers)} /><Metric label="Khách quay lại" value={formatNumber(snapshot.returningCustomers)} /></div><DetailList title="Sản phẩm bán tốt" values={snapshot.topProducts.map((item) => `${item.name}: ${item.quantity} sản phẩm`)} /><DetailList title="Rủi ro tồn kho" values={snapshot.inventoryRisks.map((item) => `${item.name}: tồn ${item.stock}, bán ${item.sold}`)} /><DetailList title="Khung giờ ít đơn" values={snapshot.slowHours.map((item) => `${item.hour}h: ${item.orders} đơn`)} /></Drawer>;
}

function EditorDrawer({ draft, onChange, onClose }: { draft: VoucherDraft; onChange: (patch: Partial<VoucherDraft>) => void; onClose: () => void }) {
  const discounts: MarketingDiscountType[] = ["percent", "amount", "gift_item", "free_shipping", "buy_x_get_y", "points_multiplier"];
  const audiences: VoucherAudience[] = ["all", "new_customers", "existing_customers", "inactive_customers", "birthday_customers", "specific_customers", "after_purchase"];
  const channels: VoucherUseChannel[] = ["pos_pickup_now", "web_pickup_later", "web_delivery"];
  const methods: VoucherIssueMethod[] = ["public", "auto_after_order", "manual_phone", "segment", "print"];
  const budgets: VoucherBudgetMode[] = ["quantity", "budget", "both"];
  return <Drawer title="Chỉnh cấu hình" onClose={onClose}><div className="space-y-5"><Section title="Nội dung"><Field label="Tên campaign" value={draft.name} onChange={(name) => onChange({ name })} /><Field label="Mã voucher" value={draft.code} onChange={(code) => onChange({ code: code.toUpperCase() })} /><Area label="Nội dung cho khách" value={draft.customerDescription} onChange={(customerDescription) => onChange({ customerDescription })} /></Section><Section title="Ưu đãi"><Select label="Loại ưu đãi" value={draft.discountType} options={discounts.map((value) => ({ value, label: discountTypeLabels[value] }))} onChange={(value) => onChange({ discountType: value as MarketingDiscountType })} /><NumberField label="Mức giảm" value={draft.discountValue} onChange={(discountValue) => onChange({ discountValue })} /><NumberField label="Giảm tối đa" value={draft.maxDiscountAmount} onChange={(maxDiscountAmount) => onChange({ maxDiscountAmount })} /><NumberField label="Đơn tối thiểu" value={draft.minOrderValue} onChange={(minOrderValue) => onChange({ minOrderValue })} /></Section><Section title="Ngân sách"><Select label="Cách giới hạn" value={draft.budgetMode} options={budgets.map((value) => ({ value, label: value === "both" ? "Cả ngân sách và số lượng" : value === "budget" ? "Theo ngân sách" : "Theo số lượng" }))} onChange={(value) => onChange({ budgetMode: value as VoucherBudgetMode })} /><NumberField label="Số lượng" value={draft.issuedLimit} onChange={(issuedLimit) => onChange({ issuedLimit })} /><NumberField label="Ngân sách tối đa" value={draft.maxBudget} onChange={(maxBudget) => onChange({ maxBudget })} /></Section><Section title="Đối tượng & kênh"><Select label="Đối tượng" value={draft.audienceType} options={audiences.map((value) => ({ value, label: audienceLabels[value] }))} onChange={(value) => onChange({ audienceType: value as VoucherAudience })} /><ToggleSet values={channels} selected={draft.channels} labels={channelLabels} onChange={(values) => onChange({ channels: values })} /><ToggleSet values={methods} selected={draft.issueMethods} labels={issueMethodLabels} onChange={(values) => onChange({ issueMethods: values })} /></Section><Section title="Điều kiện"><NumberField label="Hiệu lực sau khi nhận (ngày)" value={draft.validDaysAfterIssue} onChange={(validDaysAfterIssue) => onChange({ validDaysAfterIssue })} /><NumberField label="Mỗi khách dùng tối đa" value={draft.maxUsesPerCustomer} onChange={(maxUsesPerCustomer) => onChange({ maxUsesPerCustomer })} /><label className="flex items-center justify-between text-sm font-bold text-neutral-700">Dùng chung voucher khác<input type="checkbox" checked={draft.stackable} onChange={(event) => onChange({ stackable: event.target.checked })} /></label></Section><button onClick={onClose} className="h-11 w-full rounded-xl bg-neutral-950 text-sm font-black text-white">Áp dụng thay đổi</button></div></Drawer>;
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onMouseDown={onClose}><aside className="h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4"><h2 className="font-black text-neutral-950">{title}</h2><button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100"><X className="h-4 w-4" /></button></div><div className="space-y-6 p-5">{children}</div></aside></div>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <div className="space-y-3"><h3 className="border-b border-neutral-100 pb-2 text-xs font-black uppercase tracking-wide text-neutral-500">{title}</h3>{children}</div>; }
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-bold text-neutral-600">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500" /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block text-xs font-bold text-neutral-600">{label}<input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-brand-500" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-xs font-bold text-neutral-600">{label}<textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-brand-500" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <label className="block text-xs font-bold text-neutral-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function ToggleSet<T extends string>({ values, selected, labels, onChange }: { values: T[]; selected: T[]; labels: Record<T, string>; onChange: (values: T[]) => void }) { return <div className="flex flex-wrap gap-2">{values.map((value) => <button type="button" key={value} onClick={() => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value])} className={`rounded-full border px-3 py-2 text-xs font-bold ${selected.includes(value) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-neutral-200 text-neutral-600"}`}>{labels[value]}</button>)}</div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs font-bold text-neutral-500">{label}</p><p className="mt-1 font-black text-neutral-950">{value}</p></div>; }
function DetailList({ title, values }: { title: string; values: string[] }) { if (!values.length) return null; return <div><h3 className="text-xs font-black uppercase text-neutral-500">{title}</h3><ul className="mt-2 space-y-2 text-sm text-neutral-700">{values.map((value) => <li key={value} className="rounded-lg bg-neutral-50 px-3 py-2">{value}</li>)}</ul></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-3"><span className="text-neutral-500">{label}</span><b className="text-right text-neutral-900">{value}</b></div>; }
function Notice({ tone, children }: { tone: "error" | "warning"; children: React.ReactNode }) { return <div className={`rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{children}</div>; }
function LoadingScreen({ label }: { label: string }) { return <div className="grid min-h-[420px] place-items-center rounded-2xl border border-neutral-200 bg-white"><div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-500" /><p className="mt-3 text-sm font-bold text-neutral-500">{label}</p></div></div>; }
function discountText(draft: VoucherDraft) { return draft.discountType === "percent" ? `${draft.discountValue}%, tối đa ${formatCurrency(draft.maxDiscountAmount)}` : draft.discountType === "amount" ? formatCurrency(draft.discountValue) : discountTypeLabels[draft.discountType]; }
