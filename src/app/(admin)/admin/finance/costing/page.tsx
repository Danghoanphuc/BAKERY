"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Beaker, CheckCircle2, FlaskConical, Loader2, Plus, RefreshCw, Wheat } from "lucide-react";
import type { FinanceIngredient, Product, RecipeVersion } from "@/types";
import { calculateCostPerBaseUnitMicros } from "@/features/finance/domain/unit-conversion";

type RecipeLine = { ingredientId: string; quantity: number };

const emptyIngredient = {
  code: "", name: "", baseUnit: "gram" as const,
  purchaseAmount: 0, purchaseQuantity: 1, purchaseUnit: "kilogram" as const,
};

export default function CostingPage() {
  const [ingredients, setIngredients] = useState<FinanceIngredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredient);
  const [recipeForm, setRecipeForm] = useState({
    productId: "", effectiveFrom: new Date().toISOString().slice(0, 10),
    yieldQuantity: 1, packagingCostPerBatch: 0, directLaborCostPerBatch: 0,
    overheadCostPerBatch: 0, wastePercent: 0,
  });
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>([
    { ingredientId: "", quantity: 0 },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ingredientResponse, recipeResponse, productResponse] = await Promise.all([
      fetch("/api/admin/finance/ingredients", { cache: "no-store" }),
      fetch("/api/admin/finance/recipes", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
    ]);
    setIngredients(ingredientResponse.ok ? await ingredientResponse.json() : []);
    setRecipes(recipeResponse.ok ? await recipeResponse.json() : []);
    const productRows: Product[] = productResponse.ok ? await productResponse.json() : [];
    setProducts(productRows);
    setRecipeForm((current) => ({ ...current, productId: current.productId || productRows[0]?.id || "" }));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const preview = useMemo(() => {
    const ingredientCost = recipeLines.reduce((sum, line) => {
      const ingredient = ingredients.find((item) => item.id === line.ingredientId);
      return sum + (ingredient ? line.quantity * ingredient.costPerBaseUnitMicros / 1_000_000 : 0);
    }, 0);
    const batchCost = ingredientCost + recipeForm.packagingCostPerBatch +
      recipeForm.directLaborCostPerBatch + recipeForm.overheadCostPerBatch;
    const withWaste = batchCost * (1 + recipeForm.wastePercent / 100);
    return { ingredientCost: Math.round(ingredientCost), unitCost: Math.round(withWaste / Math.max(1, recipeForm.yieldQuantity)) };
  }, [ingredients, recipeForm, recipeLines]);

  async function createIngredient(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const unitCost = calculateCostPerBaseUnitMicros({
        purchaseAmount: ingredientForm.purchaseAmount,
        purchaseQuantity: ingredientForm.purchaseQuantity,
        purchaseUnit: ingredientForm.purchaseUnit,
      });
      const response = await fetch("/api/admin/finance/ingredients", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: ingredientForm.code, name: ingredientForm.name,
          baseUnit: unitCost.baseUnit,
          costPerBaseUnitMicros: unitCost.costPerBaseUnitMicros,
          isActive: true,
        }),
      });
      if (!response.ok) throw new Error("create_failed");
      setIngredientForm(emptyIngredient);
      setMessage("Đã thêm nguyên liệu và ghi nhận giá mua ban đầu.");
      await load();
    } catch {
      setMessage("Không thể tạo nguyên liệu. Kiểm tra quy cách mua và số tiền.");
    } finally { setSaving(false); }
  }

  async function createRecipe(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/finance/recipes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...recipeForm,
        effectiveFrom: new Date(recipeForm.effectiveFrom),
        ingredients: recipeLines,
        wasteBasisPoints: recipeForm.wastePercent * 100,
      }),
    });
    if (response.ok) {
      setMessage("Đã tạo phiên bản BOM nháp. Kiểm tra và kích hoạt khi sẵn sàng.");
      await load();
    } else setMessage("Không thể tạo BOM. Mỗi dòng cần nguyên liệu và định lượng hợp lệ.");
    setSaving(false);
  }

  async function activateRecipe(id: string) {
    setSaving(true);
    const response = await fetch(`/api/admin/finance/recipes/${id}/activate`, { method: "POST" });
    setMessage(response.ok ? "Đã kích hoạt BOM; phiên bản cũ được lưu lịch sử." : "Không thể kích hoạt BOM.");
    await load();
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      {message && <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-800">{message}</div>}
      <div className="grid gap-5 2xl:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-5">
          <Panel title="Thêm nguyên liệu" subtitle="Quy đổi giá mua về gram, ml hoặc cái." icon={<Wheat />}>
            <form onSubmit={createIngredient} className="grid gap-3 sm:grid-cols-2">
              <Input label="Mã nguyên liệu" required value={ingredientForm.code} onChange={(code) => setIngredientForm((v) => ({ ...v, code }))} />
              <Input label="Tên nguyên liệu" required value={ingredientForm.name} onChange={(name) => setIngredientForm((v) => ({ ...v, name }))} />
              <Input label="Giá mua (VND)" type="number" required value={ingredientForm.purchaseAmount} onChange={(purchaseAmount) => setIngredientForm((v) => ({ ...v, purchaseAmount: Number(purchaseAmount) }))} />
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <Input label="Số lượng mua" type="number" required value={ingredientForm.purchaseQuantity} onChange={(purchaseQuantity) => setIngredientForm((v) => ({ ...v, purchaseQuantity: Number(purchaseQuantity) }))} />
                <Select label="Đơn vị" value={ingredientForm.purchaseUnit} options={[["kilogram", "kg"], ["gram", "gram"], ["litre", "lít"], ["millilitre", "ml"], ["each", "cái"]]} onChange={(purchaseUnit) => setIngredientForm((v) => ({ ...v, purchaseUnit: purchaseUnit as typeof v.purchaseUnit }))} />
              </div>
              <button disabled={saving} className="sm:col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-bold text-white disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Thêm nguyên liệu
              </button>
            </form>
          </Panel>
          <Panel title="Danh mục nguyên liệu" subtitle={`${ingredients.length} nguyên liệu đang theo dõi`} icon={<Beaker />} action={<button onClick={() => void load()} className="rounded-lg p-2 hover:bg-neutral-100"><RefreshCw className="h-4 w-4" /></button>}>
            <div className="max-h-[430px] space-y-2 overflow-y-auto pr-1">
              {ingredients.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3">
                  <div><p className="text-sm font-bold text-neutral-900">{item.name}</p><p className="text-xs text-neutral-400">{item.code} · /{unitLabel(item.baseUnit)}</p></div>
                  <p className="text-sm font-black text-neutral-800">{formatMicros(item.costPerBaseUnitMicros)}</p>
                </div>
              ))}
              {!loading && ingredients.length === 0 && <Empty text="Chưa có nguyên liệu. Thêm nguyên liệu đầu tiên ở phía trên." />}
            </div>
          </Panel>
        </section>

        <section className="space-y-5">
          <Panel title="Lập phiên bản BOM" subtitle="Định lượng theo một mẻ và sản lượng đạt chuẩn." icon={<FlaskConical />}>
            <form onSubmit={createRecipe} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Sản phẩm" value={recipeForm.productId} options={products.map((p) => [p.id, p.name])} onChange={(productId) => setRecipeForm((v) => ({ ...v, productId }))} />
                <Input label="Sản lượng chuẩn" type="number" value={recipeForm.yieldQuantity} onChange={(yieldQuantity) => setRecipeForm((v) => ({ ...v, yieldQuantity: Number(yieldQuantity) }))} />
                <Input label="Hiệu lực từ" type="date" value={recipeForm.effectiveFrom} onChange={(effectiveFrom) => setRecipeForm((v) => ({ ...v, effectiveFrom }))} />
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="mb-2 flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide text-neutral-500">Định lượng nguyên liệu</p><button type="button" onClick={() => setRecipeLines((rows) => [...rows, { ingredientId: "", quantity: 0 }])} className="text-xs font-bold text-brand-700">+ Thêm dòng</button></div>
                <div className="space-y-2">
                  {recipeLines.map((line, index) => (
                    <div key={index} className="grid grid-cols-[1fr_120px_32px] gap-2">
                      <select value={line.ingredientId} onChange={(event) => setRecipeLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, ingredientId: event.target.value } : row))} className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm"><option value="">Chọn nguyên liệu</option>{ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} ({unitLabel(item.baseUnit)})</option>)}</select>
                      <input type="number" min={1} value={line.quantity || ""} placeholder="Định lượng" onChange={(event) => setRecipeLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Number(event.target.value) } : row))} className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm" />
                      <button type="button" onClick={() => setRecipeLines((rows) => rows.filter((_, rowIndex) => rowIndex !== index))} className="text-neutral-400 hover:text-red-600">×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Input label="Bao bì/mẻ" type="number" value={recipeForm.packagingCostPerBatch} onChange={(packagingCostPerBatch) => setRecipeForm((v) => ({ ...v, packagingCostPerBatch: Number(packagingCostPerBatch) }))} />
                <Input label="Nhân công/mẻ" type="number" value={recipeForm.directLaborCostPerBatch} onChange={(directLaborCostPerBatch) => setRecipeForm((v) => ({ ...v, directLaborCostPerBatch: Number(directLaborCostPerBatch) }))} />
                <Input label="Overhead/mẻ" type="number" value={recipeForm.overheadCostPerBatch} onChange={(overheadCostPerBatch) => setRecipeForm((v) => ({ ...v, overheadCostPerBatch: Number(overheadCostPerBatch) }))} />
                <Input label="Hao hụt (%)" type="number" value={recipeForm.wastePercent} onChange={(wastePercent) => setRecipeForm((v) => ({ ...v, wastePercent: Number(wastePercent) }))} />
              </div>
              <div className="grid gap-3 rounded-xl bg-neutral-950 p-4 text-white sm:grid-cols-3">
                <Preview label="Nguyên liệu/mẻ" value={formatMoney(preview.ingredientCost)} />
                <Preview label="Giá thành dự kiến/SP" value={formatMoney(preview.unitCost)} />
                <button disabled={saving || !recipeForm.productId} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 text-sm font-black"><Plus className="h-4 w-4" /> Lưu BOM nháp</button>
              </div>
            </form>
          </Panel>
          <Panel title="Phiên bản công thức" subtitle="Kích hoạt một phiên bản để dùng cho đơn mới." icon={<CheckCircle2 />}>
            <div className="space-y-2">
              {recipes.map((recipe) => {
                const product = products.find((item) => item.id === recipe.productId);
                return <div key={recipe.id} className="flex flex-col gap-3 rounded-xl border border-neutral-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-neutral-900">{product?.name ?? recipe.productId} · v{recipe.version}</p><p className="text-xs text-neutral-500">{recipe.ingredients.length} nguyên liệu · yield {recipe.yieldQuantity} · hiệu lực {new Date(recipe.effectiveFrom).toLocaleDateString("vi-VN")}</p></div><div className="flex items-center gap-2"><Status value={recipe.status} />{recipe.status !== "active" && <button disabled={saving} onClick={() => void activateRecipe(recipe.id)} className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-bold text-white">Kích hoạt</button>}</div></div>;
              })}
              {!loading && recipes.length === 0 && <Empty text="Chưa có BOM. Tạo phiên bản đầu tiên để tính giá thành theo công thức." />}
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, icon, action, children }: { title: string; subtitle: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span><div><h2 className="font-black text-neutral-950">{title}</h2><p className="text-xs text-neutral-500">{subtitle}</p></div></div>{action}</div>{children}</section>; }
function Input({ label, value, onChange, type = "text", required }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><input type={type} required={required} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function Preview({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>; }
function Status({ value }: { value: RecipeVersion["status"] }) { const active = value === "active"; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${active ? "bg-emerald-100 text-emerald-700" : value === "draft" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>{value}</span>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400">{text}</div>; }
function unitLabel(unit: string) { return unit === "millilitre" ? "ml" : unit === "each" ? "cái" : "gram"; }
function formatMicros(value: number) { return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value / 1_000_000)} ₫`; }
function formatMoney(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }

