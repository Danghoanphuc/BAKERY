"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Factory, Loader2, PackageCheck, Plus, ShoppingCart, SlidersHorizontal, Trash2, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import type { FinanceIngredient, IngredientPurchaseUnit, InventoryBalance, InventoryMovement, Product, RecipeVersion, WasteReason } from "@/types";

type Mode = "purchase" | "production" | "waste" | "adjustment";
type PurchaseLine = { ingredientId: string; purchasePackCount: number; lineAmount: number };
type BatchRow = { id: string; productId: string; actualGoodQuantity: number; damagedQuantity: number; totalActualCost: number; occurredAt: unknown };

export default function OperationsPage() {
  const [mode, setMode] = useState<Mode>("purchase");
  const [ingredients, setIngredients] = useState<FinanceIngredient[]>([]);
  const [recipes, setRecipes] = useState<RecipeVersion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<Array<InventoryBalance & { id: string }>>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [requestedReferenceId] = useState(() =>
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("referenceId")?.trim() ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [purchase, setPurchase] = useState({ supplierId: "", documentNumber: "", occurredAt: today() });
  const [purchaseLines, setPurchaseLines] = useState<PurchaseLine[]>([emptyPurchaseLine()]);
  const [purchaseKey, setPurchaseKey] = useState(() => `purchase:${crypto.randomUUID()}`);
  const [batchKey, setBatchKey] = useState(() => `batch:${crypto.randomUUID()}`);
  const [wasteKey, setWasteKey] = useState(() => `waste:${crypto.randomUUID()}`);
  const [adjustmentKey, setAdjustmentKey] = useState(() => `adjustment:${crypto.randomUUID()}`);
  const [batch, setBatch] = useState({ recipeVersionId: "", plannedQuantity: 1, actualGoodQuantity: 1, damagedQuantity: 0, packagingCost: 0, directLaborCost: 0, overheadCost: 0, occurredAt: today() });
  const [usages, setUsages] = useState<Array<{ ingredientId: string; actualQuantity: number }>>([]);
  const [waste, setWaste] = useState({ itemType: "product" as "product" | "ingredient", itemId: "", quantity: 1, reason: "expired" as WasteReason, occurredAt: today() });
  const [adjustment, setAdjustment] = useState({ itemType: "ingredient" as "product" | "ingredient", itemId: "", direction: "in" as "in" | "out", quantity: 1, inventoryValue: 0, reason: "", occurredAt: today() });

  const load = useCallback(async () => {
    const [ingredientRes, recipeRes, productRes, balanceRes, batchRes, movementRes] = await Promise.all([
      fetch("/api/wholesale/finance/ingredients", { cache: "no-store" }),
      fetch("/api/wholesale/finance/recipes", { cache: "no-store" }),
      fetch("/api/wholesale/products", { cache: "no-store" }),
      fetch("/api/wholesale/finance/inventory/balances", { cache: "no-store" }),
      fetch("/api/wholesale/finance/production-batches", { cache: "no-store" }),
      fetch(`/api/wholesale/finance/inventory/movements${requestedReferenceId ? `?referenceId=${encodeURIComponent(requestedReferenceId)}` : ""}`, { cache: "no-store" }),
    ]);
    setIngredients(ingredientRes.ok ? await ingredientRes.json() : []);
    setRecipes(recipeRes.ok ? await recipeRes.json() : []);
    setProducts(productRes.ok ? await productRes.json() : []);
    setBalances(balanceRes.ok ? await balanceRes.json() : []);
    setBatches(batchRes.ok ? await batchRes.json() : []);
    setMovements(movementRes.ok ? await movementRes.json() : []);
  }, [requestedReferenceId]);

  useEffect(() => {
    // Initial remote data synchronization is intentionally effect-driven.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const activeRecipes = useMemo(() => recipes.filter((item) => item.status === "active"), [recipes]);
  const selectedRecipe = activeRecipes.find((item) => item.id === batch.recipeVersionId);
  const wasteItems = waste.itemType === "product"
    ? products.map((item) => [item.id, item.name] as [string, string])
    : ingredients.filter((item) => item.isActive).map((item) => [item.id, item.name] as [string, string]);

  function selectRecipe(recipeId: string) {
    const recipe = activeRecipes.find((item) => item.id === recipeId);
    setBatch((current) => ({
      ...current, recipeVersionId: recipeId,
      plannedQuantity: recipe?.yieldQuantity ?? 1,
      actualGoodQuantity: recipe?.yieldQuantity ?? 1,
      damagedQuantity: 0,
      packagingCost: recipe?.packagingCostPerBatch ?? 0,
      directLaborCost: recipe?.directLaborCostPerBatch ?? 0,
      overheadCost: recipe?.overheadCostPerBatch ?? 0,
    }));
    setUsages(recipe?.ingredients.map((line) => ({
      ingredientId: line.ingredientId,
      actualQuantity: line.quantity,
    })) ?? []);
  }

  async function submitPurchase(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await post("/api/wholesale/finance/purchases", {
        idempotencyKey: purchaseKey, ...purchase,
        locationId: "main",
        lines: purchaseLines.map((line) => purchasePayload(line, ingredients, products)),
        occurredAt: new Date(purchase.occurredAt),
      });
      await notifyResponse(response, "Đã nhập kho nguyên liệu và cập nhật giá trị tồn.");
      if (response.ok) {
        setPurchaseLines([emptyPurchaseLine()]);
        setPurchaseKey(`purchase:${crypto.randomUUID()}`);
        await load();
      }
    } catch {
      toast.error("Không thể kết nối để nhập kho. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function submitBatch(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const response = await post("/api/wholesale/finance/production-batches", {
      idempotencyKey: batchKey,
      ...batch,
      productId: selectedRecipe?.productId,
      locationId: "main",
      ingredientUsages: usages.map((usage) => ({
        ...usage,
        componentType:
          selectedRecipe?.ingredients.find(
            (line) => line.ingredientId === usage.ingredientId,
          )?.componentType ?? "ingredient",
      })),
      occurredAt: new Date(batch.occurredAt),
    });
    await notifyResponse(response, "Đã hoàn tất mẻ, xuất nguyên liệu và nhập thành phẩm.");
    if (response.ok) { setBatchKey(`batch:${crypto.randomUUID()}`); await load(); }
    setSaving(false);
  }

  async function submitWaste(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const response = await post("/api/wholesale/finance/inventory/waste", {
      idempotencyKey: wasteKey, ...waste,
      locationId: "main", occurredAt: new Date(waste.occurredAt),
    });
    await notifyResponse(response, "Đã ghi nhận hao hụt và trừ tồn kho.");
    if (response.ok) { setWasteKey(`waste:${crypto.randomUUID()}`); await load(); }
    setSaving(false);
  }

  async function submitAdjustment(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    const response = await post("/api/wholesale/finance/inventory/adjustments", {
      idempotencyKey: adjustmentKey, ...adjustment,
      inventoryValue: adjustment.direction === "in" ? adjustment.inventoryValue : undefined,
      locationId: "main", occurredAt: new Date(adjustment.occurredAt),
    });
    await notifyResponse(response, "Đã ghi bút toán điều chỉnh tồn kho.");
    if (response.ok) {
      setAdjustmentKey(`adjustment:${crypto.randomUUID()}`);
      setAdjustment((current) => ({ ...current, quantity: 1, inventoryValue: 0, reason: "" }));
      await load();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Tồn nguyên liệu" value={`${balances.filter((item) => item.itemType === "ingredient").length} mã`} detail={formatMoney(balances.filter((item) => item.itemType === "ingredient").reduce((sum, item) => sum + item.inventoryValue, 0))} icon={<Warehouse />} />
        <Stat label="Tồn thành phẩm" value={`${balances.filter((item) => item.itemType === "product").reduce((sum, item) => sum + item.quantity, 0)} SP`} detail={formatMoney(balances.filter((item) => item.itemType === "product").reduce((sum, item) => sum + item.inventoryValue, 0))} icon={<PackageCheck />} />
        <Stat label="Mẻ đã hoàn tất" value={`${batches.length} mẻ`} detail={`Gần nhất ${batches[0] ? displayDate(batches[0].occurredAt) : "—"}`} icon={<Factory />} />
      </div>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 sm:flex">
            {([[
              "purchase", "Nhập mua", ShoppingCart,
            ], ["production", "Sản xuất", Factory], ["waste", "Hao hụt", AlertTriangle], ["adjustment", "Điều chỉnh", SlidersHorizontal]] as Array<[Mode, string, typeof ShoppingCart]>).map(([value, label, Icon]) => (
              <button key={value} onClick={() => setMode(value)} className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-black ${mode === value ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"}`}><Icon className="h-3.5 w-3.5" />{label}</button>
            ))}
          </div>
          {mode === "purchase" && <PurchaseForm data={purchase} setData={setPurchase} lines={purchaseLines} setLines={setPurchaseLines} ingredients={ingredients.filter((item) => item.isActive)} products={products} saving={saving} onSubmit={submitPurchase} />}
          {mode === "production" && <ProductionForm data={batch} setData={setBatch} recipes={activeRecipes} products={products} ingredients={ingredients} usages={usages} setUsages={setUsages} saving={saving} onSelectRecipe={selectRecipe} onSubmit={submitBatch} />}
          {mode === "waste" && <WasteForm data={waste} setData={setWaste} items={wasteItems} saving={saving} onSubmit={submitWaste} />}
          {mode === "adjustment" && <AdjustmentForm data={adjustment} setData={setAdjustment} ingredients={ingredients} products={products} saving={saving} onSubmit={submitAdjustment} />}
        </section>
        <section className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4"><h2 className="font-black text-neutral-950">Sổ tồn kho hiện tại</h2><p className="text-xs text-neutral-500">Số lượng và giá trị tồn theo bình quân gia quyền.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400"><th className="py-2">Loại</th><th>Mặt hàng</th><th className="text-right">Số lượng</th><th className="text-right">Giá trị tồn</th><th className="text-right">Bình quân</th></tr></thead><tbody>{balances.map((row) => <tr key={row.id} className="border-b border-neutral-100"><td className="py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${row.itemType === "ingredient" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{row.itemType === "ingredient" ? "Nguyên liệu" : "Thành phẩm"}</span></td><td className="font-bold text-neutral-800">{nameOf(row.itemType, row.itemId, ingredients, products)}</td><td className="text-right font-semibold">{row.quantity}</td><td className="text-right font-semibold">{formatMoney(row.inventoryValue)}</td><td className="text-right text-neutral-500">{formatMoney(row.quantity > 0 ? Math.round(row.inventoryValue / row.quantity) : 0)}</td></tr>)}</tbody></table>{balances.length === 0 && <div className="py-16 text-center text-sm text-neutral-400">Chưa có biến động kho. Bắt đầu bằng một phiếu nhập mua.</div>}</div>
        </section>
      </div>
      <section id="inventory-transactions" className="scroll-mt-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-black text-neutral-950">
              {requestedReferenceId ? "Giao dịch của mẻ vừa hoàn tất" : "Giao dịch tồn kho gần đây"}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {requestedReferenceId
                ? `Mã tham chiếu ${requestedReferenceId}`
                : "Các giao dịch xuất–nhập được ghi từ nghiệp vụ vận hành."}
            </p>
          </div>
          {requestedReferenceId && (
            <a href="/wholesale/finance/operations#inventory-transactions" className="text-xs font-bold text-neutral-600 hover:text-neutral-950">
              Xem tất cả giao dịch
            </a>
          )}
        </div>
        {movements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-400">
                  <th className="py-2">Nghiệp vụ</th>
                  <th>Mặt hàng</th>
                  <th>Ngày</th>
                  <th className="text-right">Số lượng</th>
                  <th className="text-right">Giá trị tồn</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-b border-neutral-100 last:border-0">
                    <td className="py-3 font-bold text-neutral-700">
                      {movement.type === "production_issue" ? "Xuất cho sản xuất" : movement.type === "production_output" ? "Nhập từ sản xuất" : movement.type}
                    </td>
                    <td className="font-semibold text-neutral-800">
                      {nameOf(movement.itemType, movement.itemId, ingredients, products)}
                    </td>
                    <td className="text-neutral-500">{displayDate(movement.occurredAt)}</td>
                    <td className={`text-right font-black ${movement.direction === "in" ? "text-emerald-700" : "text-red-700"}`}>
                      {movement.direction === "in" ? "+" : "−"}{movement.quantity}
                    </td>
                    <td className="text-right font-semibold">{formatMoney(movement.inventoryValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 py-10 text-center text-sm text-neutral-400">
            {requestedReferenceId ? "Không tìm thấy giao dịch cho mã tham chiếu này." : "Chưa có giao dịch tồn kho."}
          </div>
        )}
      </section>
    </div>
  );
}

function PurchaseForm({ data, setData, lines, setLines, ingredients, products, saving, onSubmit }: { data: { supplierId: string; documentNumber: string; occurredAt: string }; setData: React.Dispatch<React.SetStateAction<typeof data>>; lines: PurchaseLine[]; setLines: React.Dispatch<React.SetStateAction<PurchaseLine[]>>; ingredients: FinanceIngredient[]; products: Product[]; saving: boolean; onSubmit: (event: FormEvent) => void }) {
  const totalAmount = lines.reduce((sum, line) => sum + line.lineAmount, 0);
  return (
    <form onSubmit={onSubmit} className="min-w-0 space-y-4">
      <div>
        <h2 className="font-black text-neutral-950">Nhập mua nguyên liệu</h2>
        <p className="mt-1 text-xs leading-5 text-neutral-500">Số lượng mua sẽ được quy đổi về đơn vị tồn kho của từng nguyên liệu.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Nhà cung cấp" value={data.supplierId} onChange={(supplierId) => setData((v) => ({ ...v, supplierId }))} />
        <Input label="Số chứng từ" value={data.documentNumber} onChange={(documentNumber) => setData((v) => ({ ...v, documentNumber }))} />
      </div>
      <Input label="Ngày nhập" type="date" value={data.occurredAt} onChange={(occurredAt) => setData((v) => ({ ...v, occurredAt }))} />
      <div className="space-y-3">
        {lines.map((line, index) => {
          const spec = purchaseSpec(line.ingredientId, ingredients, products);
          const normalizedQuantity = line.purchasePackCount * spec.packQuantity;
          return (
            <div key={index} className="min-w-0 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
              <div className="flex min-w-0 items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="mb-1 block text-[11px] font-bold text-neutral-500">Nguyên liệu</span>
                  <select
                    required
                    value={line.ingredientId}
                    onChange={(event) => {
                      const nextSpec = purchaseSpec(event.target.value, ingredients, products);
                      setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? {
                        ...row,
                        ingredientId: event.target.value,
                        purchasePackCount: 1,
                        lineAmount: nextSpec.referencePrice,
                      } : row));
                    }}
                    className="h-10 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-semibold text-neutral-800"
                  >
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map((item) => <option key={item.id} value={item.id}>{item.name} · {unitLabel(item.baseUnit)}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  aria-label={`Xoá dòng nhập ${index + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {line.ingredientId && (
                <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                  <strong>Quy cách đã lưu:</strong> 1 {spec.label} = {formatBaseQuantity(spec.packQuantity, spec.baseUnit)}
                  {spec.referencePrice > 0 && <> · {formatMoney(spec.referencePrice)}/{spec.label}</>}
                </div>
              )}
              <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                <label className="min-w-0">
                  <span className="mb-1 block text-[11px] font-bold text-neutral-500">Số {spec.label} nhập</span>
                  <FormattedNumberInput
                    required
                    min="0.001"
                    step={spec.packQuantity === 1 ? 1 : "0.001"}
                    placeholder="0"
                    value={line.purchasePackCount}
                    onValueChange={(value) => setLines((rows) => rows.map((row, rowIndex) => {
                      if (rowIndex !== index) return row;
                      const nextCount = value ?? 0;
                      const currentUnitPrice = row.purchasePackCount > 0
                        ? row.lineAmount / row.purchasePackCount
                        : spec.referencePrice;
                      return {
                        ...row,
                        purchasePackCount: nextCount,
                        lineAmount: Math.round(currentUnitPrice * nextCount),
                      };
                    }))}
                    className="h-10 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-2 text-sm"
                  />
                </label>
                <label className="min-w-0">
                  <span className="mb-1 block text-[11px] font-bold text-neutral-500">Tổng tiền thực tế (VND)</span>
                  <FormattedNumberInput
                    required
                    min={0}
                    placeholder="0"
                    value={line.lineAmount}
                    onValueChange={(value) => setLines((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, lineAmount: value ?? 0 } : row))}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-2 text-sm font-semibold"
                  />
                </label>
              </div>
              {line.ingredientId && normalizedQuantity > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white p-2.5 text-xs">
                  <div>
                    <span className="block text-neutral-400">Tăng tồn</span>
                    <strong className="mt-0.5 block text-neutral-800">{formatBaseQuantity(normalizedQuantity, spec.baseUnit)}</strong>
                  </div>
                  <div className="text-right">
                    <span className="block text-neutral-400">Đơn giá quy đổi</span>
                    <strong className="mt-0.5 block text-neutral-800">{formatUnitCost(line.lineAmount, normalizedQuantity, spec.baseUnit)}</strong>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setLines((rows) => [...rows, emptyPurchaseLine()])}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-brand-300 px-3 text-xs font-bold text-brand-700 transition hover:bg-brand-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm nguyên liệu
      </button>
      <div className="flex items-center justify-between rounded-xl bg-neutral-950 px-4 py-3 text-white">
        <span className="text-xs font-semibold text-white/65">Tổng phiếu nhập</span>
        <strong className="text-sm">{formatMoney(totalAmount)}</strong>
      </div>
      <Submit saving={saving} label="Nhập kho" />
    </form>
  );
}
function ProductionForm({ data, setData, recipes, products, ingredients, usages, setUsages, saving, onSelectRecipe, onSubmit }: { data: { recipeVersionId: string; plannedQuantity: number; actualGoodQuantity: number; damagedQuantity: number; packagingCost: number; directLaborCost: number; overheadCost: number; occurredAt: string }; setData: React.Dispatch<React.SetStateAction<typeof data>>; recipes: RecipeVersion[]; products: Product[]; ingredients: FinanceIngredient[]; usages: Array<{ ingredientId: string; actualQuantity: number }>; setUsages: React.Dispatch<React.SetStateAction<typeof usages>>; saving: boolean; onSelectRecipe: (id: string) => void; onSubmit: (event: FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-3"><h2 className="font-black">Hoàn tất mẻ sản xuất</h2><Select label="BOM đang hoạt động" value={data.recipeVersionId} options={[["", "Chọn BOM"], ...recipes.map((r) => [r.id, `${products.find((p) => p.id === r.productId)?.name ?? r.productId} · v${r.version}`] as [string, string])]} onChange={onSelectRecipe} /><div className="grid grid-cols-3 gap-2"><NumberInput label="Kế hoạch" value={data.plannedQuantity} onChange={(plannedQuantity) => setData((v) => ({ ...v, plannedQuantity }))} /><NumberInput label="Đạt chuẩn" value={data.actualGoodQuantity} onChange={(actualGoodQuantity) => setData((v) => ({ ...v, actualGoodQuantity }))} /><NumberInput label="Hỏng" value={data.damagedQuantity} onChange={(damagedQuantity) => setData((v) => ({ ...v, damagedQuantity }))} /></div><div className="rounded-xl bg-neutral-50 p-3"><p className="mb-2 text-xs font-black uppercase text-neutral-400">Tiêu hao thực tế</p>{usages.map((usage, index) => <div key={usage.ingredientId} className="mb-1 flex items-center justify-between gap-3"><span className="truncate text-xs font-semibold">{ingredients.find((item) => item.id === usage.ingredientId)?.name ?? usage.ingredientId}</span><FormattedNumberInput min={1} value={usage.actualQuantity} onValueChange={(value) => setUsages((rows) => rows.map((row, i) => i === index ? { ...row, actualQuantity: value ?? 0 } : row))} className="h-9 w-28 rounded-lg border border-neutral-200 px-2 text-sm" /></div>)}</div><div className="grid grid-cols-3 gap-2"><NumberInput label="Bao bì" value={data.packagingCost} onChange={(packagingCost) => setData((v) => ({ ...v, packagingCost }))} /><NumberInput label="Nhân công" value={data.directLaborCost} onChange={(directLaborCost) => setData((v) => ({ ...v, directLaborCost }))} /><NumberInput label="Overhead" value={data.overheadCost} onChange={(overheadCost) => setData((v) => ({ ...v, overheadCost }))} /></div><Input label="Ngày sản xuất" type="date" value={data.occurredAt} onChange={(occurredAt) => setData((v) => ({ ...v, occurredAt }))} /><Submit saving={saving} label="Hoàn tất mẻ" /></form>; }
function WasteForm({ data, setData, items, saving, onSubmit }: { data: { itemType: "product" | "ingredient"; itemId: string; quantity: number; reason: WasteReason; occurredAt: string }; setData: React.Dispatch<React.SetStateAction<typeof data>>; items: Array<[string, string]>; saving: boolean; onSubmit: (event: FormEvent) => void }) { return <form onSubmit={onSubmit} className="space-y-3"><h2 className="font-black">Ghi nhận hao hụt</h2><Select label="Loại tồn" value={data.itemType} options={[["product", "Thành phẩm"], ["ingredient", "Nguyên liệu"]]} onChange={(itemType) => setData((v) => ({ ...v, itemType: itemType as typeof v.itemType, itemId: "" }))} /><Select label="Mặt hàng" value={data.itemId} options={[["", "Chọn mặt hàng"], ...items]} onChange={(itemId) => setData((v) => ({ ...v, itemId }))} /><NumberInput label="Số lượng" value={data.quantity} onChange={(quantity) => setData((v) => ({ ...v, quantity }))} /><Select label="Nguyên nhân" value={data.reason} options={[["expired", "Hết hạn"], ["production_defect", "Lỗi sản xuất"], ["damaged", "Hư hỏng"], ["overproduction", "Sản xuất dư"], ["cancelled_order", "Đơn bị huỷ"], ["stocktake_variance", "Lệch kiểm kê"], ["internal_use", "Dùng nội bộ"], ["sample", "Hàng mẫu"]]} onChange={(reason) => setData((v) => ({ ...v, reason: reason as WasteReason }))} /><Input label="Ngày ghi nhận" type="date" value={data.occurredAt} onChange={(occurredAt) => setData((v) => ({ ...v, occurredAt }))} /><Submit saving={saving} label="Ghi nhận hao hụt" /></form>; }
function AdjustmentForm({ data, setData, ingredients, products, saving, onSubmit }: { data: { itemType: "product" | "ingredient"; itemId: string; direction: "in" | "out"; quantity: number; inventoryValue: number; reason: string; occurredAt: string }; setData: React.Dispatch<React.SetStateAction<typeof data>>; ingredients: FinanceIngredient[]; products: Product[]; saving: boolean; onSubmit: (event: FormEvent) => void }) {
  const items = data.itemType === "ingredient" ? ingredients.map((item) => [item.id, item.name] as [string, string]) : products.map((item) => [item.id, item.name] as [string, string]);
  return <form onSubmit={onSubmit} className="space-y-3"><h2 className="font-black">Điều chỉnh tồn kho</h2><p className="text-xs text-neutral-500">Dùng để sửa sai có truy vết; không xoá chứng từ đã ghi.</p><Select label="Loại tồn" value={data.itemType} options={[["ingredient", "Nguyên liệu"], ["product", "Thành phẩm"]]} onChange={(itemType) => setData((v) => ({ ...v, itemType: itemType as typeof v.itemType, itemId: "" }))} /><Select label="Mặt hàng" value={data.itemId} options={[["", "Chọn mặt hàng"], ...items]} onChange={(itemId) => setData((v) => ({ ...v, itemId }))} /><Select label="Chiều điều chỉnh" value={data.direction} options={[["in", "Tăng tồn"], ["out", "Giảm tồn"]]} onChange={(direction) => setData((v) => ({ ...v, direction: direction as typeof v.direction }))} /><NumberInput label="Số lượng (đơn vị cơ sở)" value={data.quantity} onChange={(quantity) => setData((v) => ({ ...v, quantity }))} />{data.direction === "in" && <NumberInput label="Giá trị tăng (VND)" value={data.inventoryValue} onChange={(inventoryValue) => setData((v) => ({ ...v, inventoryValue }))} />}<Input label="Lý do / chứng từ tham chiếu" value={data.reason} onChange={(reason) => setData((v) => ({ ...v, reason }))} /><Input label="Ngày ghi nhận" type="date" value={data.occurredAt} onChange={(occurredAt) => setData((v) => ({ ...v, occurredAt }))} /><Submit saving={saving} label="Ghi điều chỉnh" /></form>;
}
function Stat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-neutral-400">{label}</p><p className="mt-2 text-2xl font-black text-neutral-950">{value}</p><p className="mt-1 text-xs text-neutral-500">{detail}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 [&>svg]:h-5 [&>svg]:w-5">{icon}</span></div></div>; }
function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm" /></label>; }
function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><FormattedNumberInput min={0} value={value} onValueChange={(nextValue) => onChange(nextValue ?? 0)} className="h-10 w-full rounded-xl border border-neutral-200 px-3 text-sm" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void }) { return <label className="block"><span className="mb-1 block text-xs font-bold text-neutral-600">{label}</span><select value={value} required onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>; }
function Submit({ saving, label }: { saving: boolean; label: string }) { return <button disabled={saving} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 text-sm font-black text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button>; }
function post(url: string, body: unknown) { return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
async function errorText(response: Response) { const body = await response.json().catch(() => null) as { error?: string } | null; return body?.error ?? "Không thể hoàn tất thao tác."; }
async function notifyResponse(response: Response, successMessage: string) { response.ok ? toast.success(successMessage) : toast.error(await errorText(response)); }
function today() { return new Date().toISOString().slice(0, 10); }
function nameOf(type: string, id: string, ingredients: FinanceIngredient[], products: Product[]) { return type === "ingredient" ? ingredients.find((item) => item.id === id)?.name ?? id : products.find((item) => item.id === id)?.name ?? id; }
function emptyPurchaseLine(): PurchaseLine {
  return { ingredientId: "", purchasePackCount: 1, lineAmount: 0 };
}
function purchaseSpec(ingredientId: string, ingredients: FinanceIngredient[], products: Product[]) {
  const ingredient = ingredients.find((item) => item.id === ingredientId);
  const product = products.find((item) => item.id === ingredientId && item.itemType === "ingredient");
  const baseUnit = ingredient?.baseUnit ?? product?.baseUnit ?? "gram";
  const storedPackQuantity = product?.purchasePackQuantity ?? ingredient?.purchasePackQuantity;
  const packQuantity = typeof storedPackQuantity === "number" && storedPackQuantity > 0
    ? storedPackQuantity
    : 1;
  return {
    baseUnit,
    label: ingredientId
      ? product?.purchaseUnit?.trim() || ingredient?.purchaseUnit?.trim() || unitLabel(baseUnit)
      : "quy cách",
    packQuantity,
    referencePrice: Math.max(
      0,
      Number(product?.referencePurchasePrice ?? ingredient?.referencePurchasePrice ?? 0),
    ),
  };
}
function purchasePayload(line: PurchaseLine, ingredients: FinanceIngredient[], products: Product[]) {
  const spec = purchaseSpec(line.ingredientId, ingredients, products);
  const normalizedQuantity = line.purchasePackCount * spec.packQuantity;
  return {
    ingredientId: line.ingredientId,
    purchaseQuantity: normalizedQuantity,
    purchaseUnit: spec.baseUnit as IngredientPurchaseUnit,
    purchaseUnitLabel: spec.label,
    purchasePackQuantity: spec.packQuantity,
    purchasePackCount: line.purchasePackCount,
    lineAmount: line.lineAmount,
  };
}
function unitLabel(unit: FinanceIngredient["baseUnit"]) {
  return unit === "millilitre" ? "ml" : unit === "each" ? "cái" : "g";
}
function formatBaseQuantity(quantity: number, unit: FinanceIngredient["baseUnit"]) {
  const formatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
  if (unit === "gram" && quantity >= 1_000) return `${formatter.format(quantity / 1_000)} kg`;
  if (unit === "millilitre" && quantity >= 1_000) return `${formatter.format(quantity / 1_000)} lít`;
  return `${formatter.format(quantity)} ${unitLabel(unit)}`;
}
function formatUnitCost(amount: number, normalizedQuantity: number, unit: FinanceIngredient["baseUnit"]) {
  if (normalizedQuantity <= 0) return "—";
  const baseCost = amount / normalizedQuantity;
  if (unit === "gram") return `${formatMoneyPrecise(baseCost * 1_000)}/kg · ${formatMoneyPrecise(baseCost)}/g`;
  if (unit === "millilitre") return `${formatMoneyPrecise(baseCost * 1_000)}/lít · ${formatMoneyPrecise(baseCost)}/ml`;
  return `${formatMoneyPrecise(baseCost)}/cái`;
}
function formatMoney(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }
function formatMoneyPrecise(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(value); }
function displayDate(value: unknown) { if (typeof value === "string") return new Date(value).toLocaleDateString("vi-VN"); if (value && typeof value === "object" && "seconds" in value) return new Date(Number((value as { seconds: number }).seconds) * 1000).toLocaleDateString("vi-VN"); return "—"; }
