"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ChartNoAxesCombined, CircleDollarSign, Loader2, Network, Plus, Target } from "lucide-react";
import type {
  AllocationPolicyVersion, BudgetLine, CostCenter, ExpenseCategory,
  ManagementAccountingSummary, MonthlyBudget,
} from "@/types";

type Section = "centers" | "budget" | "allocation" | "simulate";
const expenseCategories: Array<[ExpenseCategory, string]> = [
  ["ingredients", "Nguyên liệu"], ["payroll", "Lương"], ["utilities", "Điện nước"],
  ["packaging", "Bao bì"], ["delivery", "Giao hàng"], ["marketing", "Marketing"],
  ["rent", "Mặt bằng"], ["maintenance", "Bảo trì"], ["other", "Khác"],
];

export default function ManagementPage() {
  const period = new Date().toISOString().slice(0, 7);
  const [section, setSection] = useState<Section>("centers");
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [policies, setPolicies] = useState<AllocationPolicyVersion[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [summary, setSummary] = useState<ManagementAccountingSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [centerForm, setCenterForm] = useState({ code: "", name: "", type: "production", channel: "" });
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([
    { id: "revenue", metric: "net_revenue", plannedAmount: 0 },
    { id: "expense-1", metric: "expense", plannedAmount: 0, category: "ingredients" },
  ]);
  const [policyForm, setPolicyForm] = useState({ policyCode: "", name: "", sourceCostCenterId: "", effectiveFrom: today(), targetA: "", targetB: "", weightA: 50 });
  const [scenario, setScenario] = useState({ price: 0, volume: 0, variableCost: 0, fixedCost: 0 });
  const [simulation, setSimulation] = useState<{ projectedRevenue: number; projectedVariableCosts: number; projectedFixedCosts: number; contributionProfit: number; operatingProfit: number; breakEvenRevenue: number | null } | null>(null);

  const load = useCallback(async () => {
    const [centerRes, policyRes, budgetRes, summaryRes] = await Promise.all([
      fetch("/api/admin/finance/cost-centers", { cache: "no-store" }),
      fetch("/api/admin/finance/allocation-policies", { cache: "no-store" }),
      fetch(`/api/admin/finance/budgets?period=${period}`, { cache: "no-store" }),
      fetch(`/api/admin/finance/management-summary?period=${period}`, { cache: "no-store" }),
    ]);
    setCenters(centerRes.ok ? await centerRes.json() : []);
    setPolicies(policyRes.ok ? await policyRes.json() : []);
    setBudgets(budgetRes.ok ? await budgetRes.json() : []);
    setSummary(summaryRes.ok ? await summaryRes.json() : null);
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  const approvedBudget = budgets.find((item) => item.status === "approved");
  const activePolicies = policies.filter((item) => item.status === "active");

  async function createCenter(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const response = await post("/api/admin/finance/cost-centers", {
      ...centerForm, isActive: true,
      ...(centerForm.channel ? { channel: centerForm.channel } : {}),
    });
    setMessage(response.ok ? "Đã tạo trung tâm chi phí." : "Không thể tạo trung tâm chi phí.");
    if (response.ok) { setCenterForm({ code: "", name: "", type: "production", channel: "" }); await load(); }
    setSaving(false);
  }

  async function createBudget(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const response = await post("/api/admin/finance/budgets", {
      period, lines: budgetLines, createdBy: "admin",
    });
    setMessage(response.ok ? "Đã tạo ngân sách nháp. Hãy duyệt để đưa vào variance." : "Ngân sách chưa hợp lệ.");
    await load(); setSaving(false);
  }

  async function approveBudget(id: string) {
    setSaving(true); const response = await fetch(`/api/admin/finance/budgets/${id}/approve`, { method: "POST" });
    setMessage(response.ok ? "Đã duyệt ngân sách tháng." : "Không thể duyệt ngân sách."); await load(); setSaving(false);
  }

  async function createPolicy(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const targets = [
      { costCenterId: policyForm.targetA, weightBasisPoints: policyForm.weightA * 100 },
      ...(policyForm.targetB ? [{ costCenterId: policyForm.targetB, weightBasisPoints: (100 - policyForm.weightA) * 100 }] : []),
    ];
    if (!policyForm.targetB) targets[0].weightBasisPoints = 10_000;
    const response = await post("/api/admin/finance/allocation-policies", {
      policyCode: policyForm.policyCode, name: policyForm.name,
      sourceCostCenterId: policyForm.sourceCostCenterId,
      driver: "manual_weight", targets,
      effectiveFrom: new Date(policyForm.effectiveFrom),
    });
    setMessage(response.ok ? "Đã tạo chính sách nháp." : "Chính sách phân bổ chưa hợp lệ.");
    await load(); setSaving(false);
  }

  async function activatePolicy(id: string) {
    setSaving(true); const response = await fetch(`/api/admin/finance/allocation-policies/${id}/activate`, { method: "POST" });
    setMessage(response.ok ? "Đã kích hoạt chính sách phân bổ." : "Không thể kích hoạt chính sách."); await load(); setSaving(false);
  }

  async function runSimulation(event: FormEvent) {
    event.preventDefault();
    if (!summary) return;
    setSaving(true);
    const response = await post("/api/admin/finance/simulate", {
      netRevenue: summary.netRevenue,
      variableCosts: summary.variableCosts,
      fixedCosts: summary.fixedCosts + summary.allocatedIndirectCosts,
      priceChangeBasisPoints: scenario.price * 100,
      volumeChangeBasisPoints: scenario.volume * 100,
      variableCostChangeBasisPoints: scenario.variableCost * 100,
      fixedCostChangeBasisPoints: scenario.fixedCost * 100,
    });
    setSimulation(response.ok ? await response.json() : null);
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="Lãi góp" value={formatMoney(summary?.contributionProfit ?? 0)} detail={`Biên ${summary?.contributionMarginPercent ?? 0}%`} icon={<CircleDollarSign />} />
        <Kpi label="Định phí" value={formatMoney((summary?.fixedCosts ?? 0) + (summary?.allocatedIndirectCosts ?? 0))} detail="Trực tiếp + phân bổ" icon={<Network />} />
        <Kpi label="Hòa vốn" value={summary?.breakEvenRevenue ? formatMoney(summary.breakEvenRevenue) : "Chưa đủ dữ liệu"} detail="Theo lãi góp tháng" icon={<Target />} />
        <Kpi label="Lợi nhuận quản trị" value={formatMoney(summary?.operatingProfit ?? 0)} detail={approvedBudget ? "Có ngân sách đối chiếu" : "Chưa có budget duyệt"} icon={<ChartNoAxesCombined />} />
      </div>
      {message && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-bold text-brand-800">{message}</div>}
      <div className="flex flex-wrap gap-2">
        {([[
          "centers", "Trung tâm chi phí",
        ], ["budget", "Ngân sách"], ["allocation", "Phân bổ"], ["simulate", "Mô phỏng"]] as Array<[Section, string]>).map(([value, label]) => <button key={value} onClick={() => setSection(value)} className={`rounded-xl px-4 py-2 text-sm font-black ${section === value ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-white text-neutral-600"}`}>{label}</button>)}
      </div>

      {section === "centers" && <div className="grid gap-5 lg:grid-cols-[380px_1fr]"><Card title="Tạo trung tâm" subtitle="Nơi chịu trách nhiệm doanh thu hoặc chi phí."><form onSubmit={createCenter} className="space-y-3"><Input label="Mã" value={centerForm.code} onChange={(code) => setCenterForm((v) => ({ ...v, code }))} /><Input label="Tên trung tâm" value={centerForm.name} onChange={(name) => setCenterForm((v) => ({ ...v, name }))} /><Select label="Loại" value={centerForm.type} options={[["production", "Sản xuất"], ["revenue", "Doanh thu"], ["service", "Phục vụ"], ["administration", "Quản lý"]]} onChange={(type) => setCenterForm((v) => ({ ...v, type }))} /><Select label="Kênh bán liên kết" value={centerForm.channel} options={[["", "Không liên kết"], ["pos", "Tại quầy"], ["web_delivery", "Web giao hàng"], ["web_pickup", "Web đến lấy"], ["social", "Social"], ["admin", "Admin"]]} onChange={(channel) => setCenterForm((v) => ({ ...v, channel }))} /><Submit saving={saving} label="Tạo trung tâm" /></form></Card><Card title="Danh sách trung tâm" subtitle={`${centers.length} trung tâm đã thiết lập`}><div className="grid gap-3 md:grid-cols-2">{centers.map((center) => <div key={center.id} className="rounded-xl border border-neutral-200 p-4"><div className="flex justify-between"><span className="rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-black uppercase">{center.code}</span><span className="text-[10px] font-bold uppercase text-emerald-600">{center.isActive ? "Active" : "Inactive"}</span></div><p className="mt-3 font-black">{center.name}</p><p className="text-xs text-neutral-500">{center.type}{center.channel ? ` · ${center.channel}` : ""}</p></div>)}</div>{centers.length === 0 && <Empty text="Tạo cost center trước khi phân loại chi phí và lập chính sách." />}</Card></div>}

      {section === "budget" && <div className="grid gap-5 xl:grid-cols-[1fr_420px]"><Card title={`Ngân sách ${period}`} subtitle="Lập theo doanh thu và từng nhóm chi phí."><form onSubmit={createBudget} className="space-y-3">{budgetLines.map((line, index) => <div key={line.id} className="grid grid-cols-[150px_1fr_140px_32px] gap-2"><select value={line.metric} onChange={(e) => setBudgetLines((rows) => rows.map((row, i) => i === index ? { ...row, metric: e.target.value as BudgetLine["metric"], category: e.target.value === "expense" ? row.category ?? "other" : undefined } : row))} className="h-10 rounded-lg border border-neutral-200 px-2 text-xs"><option value="net_revenue">Doanh thu thuần</option><option value="expense">Chi phí</option></select>{line.metric === "expense" ? <select value={line.category} onChange={(e) => setBudgetLines((rows) => rows.map((row, i) => i === index ? { ...row, category: e.target.value as ExpenseCategory } : row))} className="h-10 rounded-lg border border-neutral-200 px-2 text-xs">{expenseCategories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select> : <div className="h-10 rounded-lg bg-neutral-50" />}<input type="number" min={0} value={line.plannedAmount || ""} placeholder="Kế hoạch" onChange={(e) => setBudgetLines((rows) => rows.map((row, i) => i === index ? { ...row, plannedAmount: Number(e.target.value) } : row))} className="h-10 rounded-lg border border-neutral-200 px-2 text-sm" /><button type="button" onClick={() => setBudgetLines((rows) => rows.filter((_, i) => i !== index))}>×</button></div>)}<button type="button" onClick={() => setBudgetLines((rows) => [...rows, { id: cryptoId(), metric: "expense", category: "other", plannedAmount: 0 }])} className="text-xs font-bold text-brand-700">+ Thêm dòng ngân sách</button><Submit saving={saving} label="Lưu ngân sách nháp" /></form></Card><Card title="Các phiên bản" subtitle="Chỉ bản approved đi vào variance."><div className="space-y-2">{budgets.map((budget) => <div key={budget.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3"><div><p className="text-sm font-black">Version {budget.version}</p><p className="text-xs text-neutral-500">{budget.lines.length} dòng · {budget.status}</p></div>{budget.status === "draft" ? <button onClick={() => void approveBudget(budget.id)} className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-bold text-white">Duyệt</button> : <Badge value={budget.status} />}</div>)}</div></Card></div>}

      {section === "allocation" && <div className="grid gap-5 xl:grid-cols-[420px_1fr]"><Card title="Chính sách phân bổ" subtitle="Phân bổ chi phí gián tiếp theo trọng số."><form onSubmit={createPolicy} className="space-y-3"><div className="grid grid-cols-2 gap-2"><Input label="Mã chính sách" value={policyForm.policyCode} onChange={(policyCode) => setPolicyForm((v) => ({ ...v, policyCode }))} /><Input label="Tên" value={policyForm.name} onChange={(name) => setPolicyForm((v) => ({ ...v, name }))} /></div><Select label="Nguồn chi phí" value={policyForm.sourceCostCenterId} options={[["", "Chọn trung tâm nguồn"], ...centers.map(centerOption)]} onChange={(sourceCostCenterId) => setPolicyForm((v) => ({ ...v, sourceCostCenterId }))} /><div className="grid grid-cols-[1fr_90px] gap-2"><Select label="Đích A" value={policyForm.targetA} options={[["", "Chọn đích"], ...centers.map(centerOption)]} onChange={(targetA) => setPolicyForm((v) => ({ ...v, targetA }))} /><NumberInput label="Tỷ trọng %" value={policyForm.weightA} onChange={(weightA) => setPolicyForm((v) => ({ ...v, weightA: Math.min(100, weightA) }))} /></div><Select label="Đích B (tuỳ chọn)" value={policyForm.targetB} options={[["", "Không có"], ...centers.map(centerOption)]} onChange={(targetB) => setPolicyForm((v) => ({ ...v, targetB }))} /><Input label="Hiệu lực từ" type="date" value={policyForm.effectiveFrom} onChange={(effectiveFrom) => setPolicyForm((v) => ({ ...v, effectiveFrom }))} /><Submit saving={saving} label="Tạo policy nháp" /></form></Card><Card title="Phiên bản phân bổ" subtitle={`${activePolicies.length} policy đang hoạt động`}><div className="space-y-2">{policies.map((policy) => <div key={policy.id} className="flex items-center justify-between rounded-xl border border-neutral-200 p-4"><div><p className="text-sm font-black">{policy.name} · v{policy.version}</p><p className="text-xs text-neutral-500">{policy.policyCode} · {policy.targets.length} đích · {policy.driver}</p></div>{policy.status === "draft" ? <button onClick={() => void activatePolicy(policy.id)} className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-bold text-white">Kích hoạt</button> : <Badge value={policy.status} />}</div>)}</div></Card></div>}

      {section === "simulate" && <div className="grid gap-5 xl:grid-cols-[420px_1fr]"><Card title="Giả định kịch bản" subtitle="Thay đổi theo phần trăm so với tháng hiện tại."><form onSubmit={runSimulation} className="space-y-3"><ScenarioSlider label="Giá bán" value={scenario.price} onChange={(price) => setScenario((v) => ({ ...v, price }))} /><ScenarioSlider label="Sản lượng" value={scenario.volume} onChange={(volume) => setScenario((v) => ({ ...v, volume }))} /><ScenarioSlider label="Biến phí đơn vị" value={scenario.variableCost} onChange={(variableCost) => setScenario((v) => ({ ...v, variableCost }))} /><ScenarioSlider label="Định phí" value={scenario.fixedCost} onChange={(fixedCost) => setScenario((v) => ({ ...v, fixedCost }))} /><Submit saving={saving} label="Chạy mô phỏng" /></form></Card><Card title="Kết quả dự phóng" subtitle="Không ghi vào dữ liệu thực tế.">{simulation ? <div className="grid gap-3 sm:grid-cols-2"><Result label="Doanh thu" value={simulation.projectedRevenue} baseline={summary?.netRevenue} /><Result label="Lãi góp" value={simulation.contributionProfit} baseline={summary?.contributionProfit} /><Result label="Lợi nhuận hoạt động" value={simulation.operatingProfit} baseline={summary?.operatingProfit} /><Result label="Doanh thu hòa vốn" value={simulation.breakEvenRevenue ?? 0} baseline={summary?.breakEvenRevenue ?? undefined} /></div> : <Empty text="Điều chỉnh giả định và chạy mô phỏng để xem tác động." />}</Card></div>}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="mb-4"><h2 className="font-black text-neutral-950">{title}</h2><p className="text-xs text-neutral-500">{subtitle}</p></div>{children}</section>; }
function Kpi({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><div className="flex justify-between"><p className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</p><span className="text-brand-600 [&>svg]:h-4 [&>svg]:w-4">{icon}</span></div><p className="mt-3 text-xl font-black text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><input required type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm" /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><select required value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function Submit({ saving, label }: { saving: boolean; label: string }) { return <button disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{label}</button>; }
function Badge({ value }: { value: string }) { return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${value === "active" || value === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{value}</span>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-12 text-center text-sm text-neutral-400">{text}</div>; }
function ScenarioSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="flex justify-between text-xs font-bold text-neutral-600"><span>{label}</span><strong className={value >= 0 ? "text-emerald-600" : "text-red-600"}>{value > 0 ? "+" : ""}{value}%</strong></span><input type="range" min={-30} max={30} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-neutral-950" /></label>; }
function Result({ label, value, baseline }: { label: string; value: number; baseline?: number }) { const change = baseline ? Math.round((value - baseline) / Math.abs(baseline) * 1000) / 10 : null; return <div className="rounded-xl bg-neutral-50 p-4"><p className="text-xs font-bold uppercase text-neutral-400">{label}</p><p className="mt-2 text-xl font-black">{formatMoney(value)}</p>{change != null && <p className={`mt-1 text-xs font-bold ${change >= 0 ? "text-emerald-600" : "text-red-600"}`}>{change > 0 ? "+" : ""}{change}% so với hiện tại</p>}</div>; }
function centerOption(center: CostCenter): [string, string] { return [center.id, `${center.code} · ${center.name}`]; }
function post(url: string, body: unknown) { return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
function cryptoId() { return typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2); }
function today() { return new Date().toISOString().slice(0, 10); }
function formatMoney(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }
