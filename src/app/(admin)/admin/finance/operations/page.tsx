"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Factory, Loader2, PackageCheck, ShoppingCart, Warehouse } from "lucide-react";
import type { FinanceIngredient, InventoryBalance, Product, RecipeVersion, WasteReason } from "@/types";

type Mode = "purchase" | "production" | "waste";
type PurchaseLine = { ingredientId: string; quantity: number; lineAmount: number };
type BatchRow = { id: string; productId: string; actualGoodQuantity: number; damagedQuantity: number; totalActualCost: number; occurredAt: unknown };

export default function OperationsPage() {
  const [mode, setMode] = useState<Mode>("purchase");
  const [ingredients, setIngredients] = useState<FinanceIngredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<Array<InventoryBalance & { id: string }>>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [purchase, setPurchase] = useState({ supplierId: "", documentNumber: "", occurredAt: today() });
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([{ ingredientId: "", quantity: 0, lineAmount: 0 }]);
  const [batch, setBatch] = useState({ recipeVersionId: "", plannedQuantity: 1, actualGoodQuantity: 1, damagedQuantity: 0, packagingCost: 0, directLaborCost: 0, overheadCost: 0, occurredAt: today() });
  const [usages, setUsages] = useState<Array<{ ingredientId: string; actualQuantity: number }>>([]);
  const [waste, setWaste] = useState({ itemType: "product" as "product" | "ingredient", itemId: "", quantity: 1, reason: "expired" as WasteReason, occurredAt: today() });

  const load = useCallback(async () => {
    const [ingredientRes, recipeRes, productRes, balanceRes, batchRes] = await Promise.all([
      fetch("/api/admin/finance/ingredients", { cache: "no-store" }),
      fetch("/api/admin/finance/recipes", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/admin/finance/inventory/balances", { cache: "no-store" }),
      fetch("/api/admin/finance/production-batches", { cache: "no-store" }),
    ]);
    setIngredients(ingredientRes.ok ? await ingredientRes.json() : []);
    setRecipes(recipeRes.ok ? await recipeRes.json() : []);
    setProducts(productRes.ok ? await productRes.json() : []);
    setBalances(balanceRes.ok ? await balanceRes.json() : []);
    setBatches(batchRes.ok ? await batchRes.json() : []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeRecipes = useMemo(() => recipes.filter((item) => item.status === "active"), [recipes]);
  const selectedRecipe = activeRecipes.find((item) => item.id === batch.recipeVersionId);
  const wasteItems = waste.itemType === "product"
    ? products.map((item) => [item.id, item.name] as [string, string])
    : ingredients.map((item) => [item.id, item.name] as [string, string]);

  function selectRecipe(recipeId: string) {
    const recipe = activeRecipes.find((item) => item.id === recipeId);
    setBatch((current) => ({ ...current, recipeVersionId: recipeId, plannedQuantity: recipe?.yieldQuantity ?? 1, actualGoodQuantity: recipe?.yieldQuantity ?? 1 }));
    setUsages(recipe?.ingredients.map((line) => ({ ingredientId: line.ingredientId, actualQuantity: line.quantity })) ?? []);
  }

  async function submitPurchase(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const response = await post("/api/admin/finance/purchases", {
      idempotencyKey: `purchase:${crypto.randomUUID()}`, ...purchase,
      locationId: "main", lines: purchaseLines, occurredAt: new Date(purchase.occurredAt),
    });
    setMessage(response.ok ? "Đã nhập kho nguyên liệu và cập nhật giá trị tồn." : await errorText(response));
    if (response.ok) { setPurchaseLines([{ ingredientId: "", quantity: 0, lineAmount: 0 }]); await load(); }
    setSaving(false);
  }

  async function submitBatch(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const response = await post("/api/admin/finance/production-batches", {
      idempotencyKey: `batch:${crypto.randomUUID()}`,
      ...batch,
      productId: selectedRecipe?.productId,
      locationId: "main",
      ingredientUsages: usages,
      occurredAt: new Date(batch.occurredAt),
    });
    setMessage(response.ok ? "Đã hoàn tất mẻ, xuất nguyên liệu và nhập thành phẩm." : await errorText(response));
    if (response.ok) await load();
    setSaving(false);
  }

  async function submitWaste(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const response = await post("/api/admin/finance/inventory/waste", {
      idempotencyKey: `waste:${crypto.randomUUID()}`, ...waste,
      locationId: "main", occurredAt: new Date(waste.occurredAt),
    });
    setMessage(response.ok ? "Đã ghi nhận hao hụt và trừ tồn kho." : await errorText(response));
    if (response.ok) await load();
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tồn nguyên liệu" value={`${balances.filter((item) => item.itemType === "ingredient").length} mã`} detail={formatMoney(balances.filter((item) => item.itemType === "ingredient").reduce((sum, item) => sum + item.inventoryValue, 0))} icon={<Warehouse />} />
        <Stat label="Tồn thành phẩm" value={`${balances.filter((item) => item.itemType === "product").reduce((sum, item) => sum + item.quantity, 0)} SP`} detail={formatMoney(balances.filter((item) => item.itemType === "product").reduce((sum, item) => sum + item.inventoryValue, 0))} icon={<PackageCheck />} />
        <Stat label="Mẻ đã hoàn tất" value={`${batches.length} mẻ`} detail={`Gần nhất ${batches[0] ? displayDate(batches[0].occurredAt) : "—"}`} icon={<Factory />} />
      </div>
      {message && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">{message}</div>}
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex rounded-xl bg-neutral-100 p-1">
            {([[
              "purchase", "Nhập mua", ShoppingCart,
            ], ["production", "Sản xuất", Factory], ["waste", "Hao hụt", AlertTriangle]] as Array<[Mode, string, typeof ShoppingCart]>).map(([value, label, Icon]) => (
              <button key={value} onClick={() => setMode(value)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-black ${mode === value ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"}`}><Icon className="h-3.5 w-3.5" />{label}</button>
            ))}
          </div>
          {mode === "purchase" && <PurchaseForm data={purchase} setData={setPurchase} lines={purchaseLines} setLines={setPurchaseLines} ingredients={ingredients} saving={saving} onSubmit={submitPurchase} />}
          {mode === "production" && <ProductionForm data={batch} setData={setBatch} recipes={activeRecipes} products={products} usages={usages} setUsages={setUsages} saving={saving} onSelectRecipe={selectRecipe} onSubmit={submitBatch} />}
          {mode === "waste" && <WasteForm data={waste} setData={setWaste} items={wasteItems} saving={saving} onSubmit={submitWaste} />}
        </section>
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="font-black text-neutral-950">Sổ tồn kho hiện tại</h2><p className="text-xs text-neutral-500">Số lượng và giá trị tồn theo bình quân gia quyền.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400"><th className="py-2">Loại</th><th>Mặt hàng</th><th className="text-right">Số lượng</th><th className="text-right">Giá trị tồn</th><th className="text-right">Bình quân</th></tr></thead><tbody>{balances.map((row) => <tr key={row.id} className="border-b border-neutral-100"><td className="py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${row.itemType === "ingredient" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{row.itemType === "ingredient" ? "Nguyên liệu" : "Thành phẩm"}</span></td><td className="font-bold text-neutral-800">{nameOf(row.itemType, row.itemId, ingredients, products)}</td><td className="text-right font-semibold">{row.quantity}</td><td className="text-right font-semibold">{formatMoney(row.inventoryValue)}</td><td className="text-right text-neutral-500">{formatMoney(row.quantity > 0 ? Math.round(row.inventoryValue / row.quantity) : 0)}</td></tr>)}</tbody></table>{balances.length === 0 && <div className="py-16 text-center text-sm text-neutral-400">Chưa có biến động kho. Bắt đầu bằng một phiếu nhập mua.</div>}</div>
        </section>
      </div>
    </div>
  );
}

function PurchaseForm({ data, setData, lines, setLines, ingredients, saving, onSubmit }: { data: { supplierId: string; documentNumber: string; occurredAt: string }; setData: React.Dispatch<React.SetStateAction<typeof data>>; lines: PurchaseLine[]; setLines: React.Dispatch<React.SetStateAction<PurchaseLine[]>>; ingredients: FinanceIngredient[]; saving: boolean; onSubmit: (event: FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-3"><h2 className="font-black">Nhập mua nguyên liệu</h2><div className="grid grid-cols-2 gap-2"><Input label="Nhà cung cấp" value={data.supplierId} onChange={(supplierId) => setData((v) => ({ ...v, supplierId }))} /><Input label="Số chứng từ" value={data.documentNumber} onChange={(documentNumber) => setData((v) => ({ ...v, documentNumber }))} /></div><Input label="Ngày nhập" type="date" value={data.occurredAt} onChange={(occurredAt) => setData((v) => ({ ...v, occurredAt }))} />{lines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_80px_110px_24px] gap-1.5"><select required value={line.ingredientId} onChange={(e) => setLines((rows) => rows.map((row, i) => i === index ? { ...row, ingredientId: e.target.value } : row))} className="h-10 rounded-lg border border-neutral-200 px-2 text-xs"><option value="">Nguyên liệu</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required type="number" min={1} placeholder="SL" value={line.quantity || ""} onChange={(e) => setLines((rows) => rows.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row))} className="h-10 rounded-lg border border-neutral-200 px-2 text-xs" /><input required type="number" min={0} placeholder="Thành tiền" value={line.lineAmount || ""} onChange={(e) => setLines((rows) => rows.map((row, i) => i === index ? { ...row, lineAmount: Number(e.target.value) } : row))} className="h-10 rounded-lg border border-neutral-200 px-2 text-xs" /><button type="button" onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))}>×</button></div>)}<button type="button" onClick={() => setLines((rows) => [...rows, { ingredientId: "", quantity: 0, lineAmount: 0 }])} className="text-xs font-bold text-brand-700">+ Thêm dòng</button><Submit saving={saving} label="Nhập kho" /></form>; }
function ProductionForm({ data, setData, recipes, products, usages, setUsages, saving, onSelectRecipe, onSubmit }: { data: { recipeVersionId: string; plannedQuantity: number; actualGoodQuantity: number; damagedQuantity: number; packagingCost: number; directLaborCost: number; overheadCost: number; occurredAt: string }; setData: React.Dispatch<React.SetStateAction<typeof data>>; recipes: RecipeVersion[]; products: Product[]; usages: Array<{ ingredientId: string; actualQuantity: number }>; setUsages: React.Dispatch<React.SetStateAction<typeof usages>>; saving: boolean; onSelectRecipe: (id: string) => void; onSubmit: (event: FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-3"><h2 className="font-black">Hoàn tất mẻ sản xuất</h2><Select label="BOM đang hoạt động" value={data.recipeVersionId} options={[["", "Chọn BOM"], ...recipes.map((r) => [r.id, `${products.find((p) => p.id === r.productId)?.name ?? r.productId} · v${r.version}`] as [string, string])]} onChange={onSelectRecipe} /><div className="grid grid-cols-3 gap-2"><NumberInput label="Kế hoạch" value={data.plannedQuantity} onChange={(plannedQuantity) => setData((v) => ({ ...v, plannedQuantity }))} /><NumberInput label="Đạt chuẩn" value={data.actualGoodQuantity} onChange={(actualGoodQuantity) => setData((v) => ({ ...v, actualGoodQuantity }))} /><NumberInput label="Hỏng" value={data.damagedQuantity} onChange={(damagedQuantity) => setData((v) => ({ ...v, damagedQuantity }))} /></div><div className="rounded-xl bg-neutral-50 p-3"><p className="mb-2 text-xs font-black uppercase text-neutral-400">Tiêu hao thực tế</p>{usages.map((usage, index) => <div key={usage.ingredientId} className="mb-1 flex items-center justify-between gap-3"><span className="truncate text-xs font-semibold">{usage.ingredientId}</span><input type="number" min={1} value={usage.actualQuantity} onChange={(e) => setUsages((rows) => rows.map((row, i) => i === index ? { ...row, actualQuantity: Number(e.target.value) } : row))} className="h-9 w-28 rounded-lg border border-neutral-200 px-2 text-sm" /></div>)}</div><div className="grid grid-cols-3 gap-2"><NumberInput label="Bao bì" value={data.packagingCost} onChange={(packagingCost) => setData((v) => ({ ...v, packagingCost }))} /><NumberInput label="Nhân công" value={data.directLaborCost} onChange={(directLaborCost) => setData((v) => ({ ...v, directLaborCost }))} /><NumberInput label="Overhead" value={data.overheadCost} onChange={(overheadCost) => setData((v) => ({ ...v, overheadCost }))} /></div><Input label="Ngày sản xuất" type="date" value={data.occurredAt} onChange={(occurredAt) => setData((v) => ({ ...v, occurredAt }))} /><Submit saving={saving} label="Hoàn tất mẻ" /></form>; }
function WasteForm({ data, setData, items, saving, onSubmit }: { data: { itemType: "product" | "ingredient"; itemId: string; quantity: number; reason: WasteReason; occurredAt: string }; setData: React.Dispatch<React.SetStateAction<typeof data>>; items: Array<[string, string]>; saving: boolean; onSubmit: (event: FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-3"><h2 className="font-black">Ghi nhận hao hụt</h2><Select label="Loại tồn" value={data.itemType} options={[["product", "Thành phẩm"], ["ingredient", "Nguyên liệu"]]} onChange={(itemType) => setData((v) => ({ ...v, itemType: itemType as typeof v.itemType, itemId: "" }))} /><Select label="Mặt hàng" value={data.itemId} options={[["", "Chọn mặt hàng"], ...items]} onChange={(itemId) => setData((v) => ({ ...v, itemId }))} /><NumberInput label="Số lượng" value={data.quantity} onChange={(quantity) => setData((v) => ({ ...v, quantity }))} /><Select label="Nguyên nhân" value={data.reason} options={[["expired", "Hết hạn"], ["production_defect", "Lỗi sản xuất"], ["damaged", "Hư hỏng"], ["overproduction", "Sản xuất dư"], ["cancelled_order", "Đơn bị huỷ"], ["stocktake_variance", "Lệch kiểm kê"], ["internal_use", "Dùng nội bộ"], ["sample", "Hàng mẫu"]]} onChange={(reason) => setData((v) => ({ ...v, reason: reason as WasteReason }))} /><Input label="Ngày ghi nhận" type="date" value={data.occurredAt} onChange={(occurredAt) => setData((v) => ({ ...v, occurredAt }))} /><Submit saving={saving} label="Ghi nhận hao hụt" /></form>; }
function Stat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 text-2xl font-black text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span></div></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm" /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><select value={value} required onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function Submit({ saving, label }: { saving: boolean; label: string }) { return <button disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-black text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button>; }
function post(url: string, body: unknown) { return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
async function errorText(response: Response) { const body = await response.json().catch(() => null) as { error?: string } | null; return body?.error ?? "Không thể hoàn tất thao tác."; }
function today() { return new Date().toISOString().slice(0, 10); }
function nameOf(type: string, id: string, ingredients: FinanceIngredient[], products: Product[]) { return type === "ingredient" ? ingredients.find((item) => item.id === id)?.name ?? id : products.find((item) => item.id === id)?.name ?? id; }
function formatMoney(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }
function displayDate(value: unknown) { if (typeof value === "string") return new Date(value).toLocaleDateString("vi-VN"); if (value && typeof value === "object" && "seconds" in value) return new Date(Number((value as { seconds: number }).seconds) * 1000).toLocaleDateString("vi-VN"); return "—"; }
