/* Hallmark · genre: editorial · macrostructure: Split Studio · theme: SweetTime warm editorial · enrichment: none */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  ExternalLink,
  Factory,
  Loader2,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Wheat,
  X,
} from "lucide-react";
import {
  calculateProductionPlan,
  inventoryPlanKey,
} from "@/features/wholesale-production-plan/domain/production-plan";
import {
  ProductLabelPrintDialog,
  type ProductLabelItem,
} from "@/features/product-labels";
import type { InventoryBalance, Product } from "@/types";
import type {
  ProductionGroup,
  ProductionGroupDraft,
  ProductionGroupInputLine,
  ProductionPlanInventoryItemType,
  ProductionPlanUnit,
} from "@/types/production-plan";

type SaveState = "idle" | "saving" | "error" | "success";
type CompletionState = "idle" | "saving" | "error" | "success";
type CompletionDraft = {
  idempotencyKey: string;
  batchCount: number;
  occurredAt: string;
  outputs: Array<{ productId: string; plannedQuantity: number; actualQuantity: number }>;
  materials: Array<{
    itemType: ProductionPlanInventoryItemType;
    itemId: string;
    plannedQuantity: number;
    actualQuantity: number;
  }>;
};

const inputClass =
  "h-11 w-full rounded-xl border border-sand bg-bg-card px-3 text-sm font-semibold text-navy outline-2 outline-transparent outline-offset-1 placeholder:text-text-light hover:bg-bg-main focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50";

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-extrabold transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

function emptyDraft(): ProductionGroupDraft {
  return {
    name: "",
    batchLabel: "thau",
    batchCapacity: 5_000,
    batchUnit: "gram",
    inputLines: [],
    outputLines: [],
  };
}

function copyGroup(group: ProductionGroup): ProductionGroupDraft {
  return {
    id: group.id,
    name: group.name,
    batchLabel: group.batchLabel,
    batchCapacity: group.batchCapacity,
    batchUnit: group.batchUnit,
    inputLines: group.inputLines.map((line) => ({ ...line })),
    outputLines: group.outputLines.map((line) => ({ ...line })),
  };
}

function productName(products: Product[], id: string) {
  const product = products.find((item) => item.id === id);
  return product?.displayName || product?.name || id;
}

function unitLabel(unit: ProductionPlanUnit | Product["baseUnit"] | undefined) {
  if (unit === "gram") return "g";
  if (unit === "millilitre") return "ml";
  return "cái";
}

function formatQuantity(value: number, unit?: ProductionPlanUnit | Product["baseUnit"]) {
  return `${new Intl.NumberFormat("vi-VN").format(value)} ${unitLabel(unit)}`;
}

function inventoryTypeForProduct(product: Product): ProductionPlanInventoryItemType {
  return product.itemType === "ingredient" ? "ingredient" : "product";
}

function balancesToMap(balances: InventoryBalance[]) {
  const result: Record<string, number> = {};
  for (const balance of balances) {
    const key = inventoryPlanKey(balance.itemType, balance.itemId);
    result[key] = (result[key] ?? 0) + balance.quantity;
  }
  return result;
}

function stockWithGroupDefaults(
  current: Record<string, number>,
  group: ProductionGroup | undefined,
  balanceByKey: Record<string, number>,
) {
  if (!group) return current;
  const next = { ...current };
  for (const output of group.outputLines) {
    if (next[output.productId] === undefined) {
      next[output.productId] =
        balanceByKey[inventoryPlanKey("product", output.productId)] ?? 0;
    }
  }
  return next;
}

export function ProductionPlanShell() {
  const [groups, setGroups] = useState<ProductionGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [stockByProductId, setStockByProductId] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [draft, setDraft] = useState<ProductionGroupDraft>(emptyDraft);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [completionDraft, setCompletionDraft] = useState<CompletionDraft | null>(null);
  const [completionState, setCompletionState] = useState<CompletionState>("idle");
  const [completionError, setCompletionError] = useState("");
  const [completedReferenceId, setCompletedReferenceId] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [groupResponse, productResponse, balanceResponse] = await Promise.all([
          fetch("/api/wholesale/production-plan/groups", { cache: "no-store" }),
          fetch("/api/wholesale/products", { cache: "no-store" }),
          fetch("/api/wholesale/finance/inventory/balances", { cache: "no-store" }),
        ]);
        if (!groupResponse.ok || !productResponse.ok || !balanceResponse.ok) {
          throw new Error("LOAD_FAILED");
        }
        const [nextGroups, nextProducts, nextBalances] = await Promise.all([
          groupResponse.json() as Promise<ProductionGroup[]>,
          productResponse.json() as Promise<Product[]>,
          balanceResponse.json() as Promise<InventoryBalance[]>,
        ]);
        if (cancelled) return;
        setGroups(nextGroups);
        setProducts(nextProducts);
        setBalances(nextBalances);
        setSelectedGroupId(nextGroups[0]?.id ?? "");
        setStockByProductId((current) =>
          stockWithGroupDefaults(
            current,
            nextGroups[0],
            balancesToMap(nextBalances),
          ),
        );
        if (nextGroups.length === 0) {
          setDraft(emptyDraft());
          setIsConfigOpen(true);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Không tải được dữ liệu sản xuất. Hãy thử tải lại trang.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );

  const balanceByKey = useMemo(() => balancesToMap(balances), [balances]);

  const suggestion = useMemo(
    () =>
      activeGroup
        ? calculateProductionPlan(activeGroup, stockByProductId, balanceByKey)
        : null,
    [activeGroup, balanceByKey, stockByProductId],
  );

  const plannedLabelItems = useMemo<ProductLabelItem[]>(
    () =>
      (suggestion?.outputs ?? []).map((output) => {
        const product = products.find((item) => item.id === output.productId);
        return {
          id: output.productId,
          name: product?.displayName || product?.name || output.productId,
          sku: product?.sku,
          barcode: product?.barcode,
          price: product?.price,
          defaultQuantity: output.plannedQuantity,
        };
      }),
    [products, suggestion?.outputs],
  );

  function resetSystemStock() {
    if (!activeGroup) return;
    setStockByProductId((current) => {
      const next = { ...current };
      for (const output of activeGroup.outputLines) {
        next[output.productId] =
          balanceByKey[inventoryPlanKey("product", output.productId)] ?? 0;
      }
      return next;
    });
  }

  function openCompletion() {
    if (!suggestion || suggestion.batchCount <= 0) return;
    setCompletionDraft({
      idempotencyKey: `production-plan:${crypto.randomUUID()}`,
      batchCount: suggestion.batchCount,
      occurredAt: new Date().toISOString().slice(0, 10),
      outputs: suggestion.outputs
        .filter((line) => line.plannedQuantity > 0)
        .map((line) => ({
          productId: line.productId,
          plannedQuantity: line.plannedQuantity,
          actualQuantity: line.plannedQuantity,
        })),
      materials: suggestion.materials.map((line) => ({
        itemType: line.itemType,
        itemId: line.itemId,
        plannedQuantity: line.requiredQuantity,
        actualQuantity: line.requiredQuantity,
      })),
    });
    setCompletionState("idle");
    setCompletionError("");
    setCompletedReferenceId("");
  }

  async function submitCompletion(event: FormEvent) {
    event.preventDefault();
    if (!activeGroup || !suggestion || !completionDraft) return;
    setCompletionState("saving");
    setCompletionError("");
    try {
      const response = await fetch("/api/wholesale/production-plan/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...completionDraft,
          groupId: activeGroup.id,
          locationId: "main",
          occurredAt: new Date(completionDraft.occurredAt),
        }),
      });
      const payload = await response.json() as { id?: string; error?: string };
      if (!response.ok || !payload.id) {
        const shortageId = payload.error?.startsWith("INSUFFICIENT_INVENTORY:")
          ? payload.error.split(":").slice(1).join(":")
          : "";
        throw new Error(
          shortageId
            ? `Không đủ tồn kho của ${productName(products, shortageId)} để hoàn tất mẻ.`
            : payload.error || "Không thể hoàn tất kế hoạch sản xuất.",
        );
      }
      setCompletedReferenceId(payload.id);
      setCompletionState("success");
      const balanceResponse = await fetch(
        "/api/wholesale/finance/inventory/balances",
        { cache: "no-store" },
      );
      if (balanceResponse.ok) {
        const nextBalances = await balanceResponse.json() as InventoryBalance[];
        setBalances(nextBalances);
      }
    } catch (error) {
      setCompletionError(
        error instanceof Error ? error.message : "Không thể hoàn tất kế hoạch sản xuất.",
      );
      setCompletionState("error");
    }
  }

  function editActiveGroup() {
    if (!activeGroup) return;
    setDraft(copyGroup(activeGroup));
    setSaveState("idle");
    setSaveError("");
    setIsConfigOpen(true);
  }

  function createGroup() {
    setDraft(emptyDraft());
    setSaveState("idle");
    setSaveError("");
    setIsConfigOpen(true);
  }

  async function saveGroup(event: FormEvent) {
    event.preventDefault();
    setSaveState("saving");
    setSaveError("");
    try {
      const response = await fetch("/api/wholesale/production-plan/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await response.json()) as ProductionGroup | { error?: string };
      if (!response.ok || !("id" in payload)) {
        throw new Error("error" in payload ? payload.error : undefined);
      }
      const saved = payload;
      setGroups((current) => {
        const exists = current.some((group) => group.id === saved.id);
        const next = exists
          ? current.map((group) => (group.id === saved.id ? saved : group))
          : [...current, saved];
        return next.sort((left, right) => left.name.localeCompare(right.name, "vi"));
      });
      setSelectedGroupId(saved.id);
      setStockByProductId((current) =>
        stockWithGroupDefaults(current, saved, balanceByKey),
      );
      setDraft(copyGroup(saved));
      setSaveState("success");
      window.setTimeout(() => {
        setIsConfigOpen(false);
        setSaveState("idle");
      }, 450);
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : "Không thể lưu cấu hình. Kiểm tra lại các dòng nguyên liệu và thành phẩm.",
      );
      setSaveState("error");
    }
  }

  if (isLoading) {
    return (
      <div className="grid min-h-[420px] place-items-center" aria-live="polite">
        <div className="flex items-center gap-3 text-sm font-bold text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải dữ liệu sản xuất…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
        <p className="flex items-center gap-2 font-extrabold">
          <AlertTriangle className="h-5 w-5" />
          Không thể mở kế hoạch sản xuất
        </p>
        <p className="mt-2 text-sm">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <header className="flex min-w-0 flex-col gap-4 border-b border-sand pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="min-w-0 font-display text-2xl font-bold tracking-[-0.03em] text-navy [overflow-wrap:anywhere] sm:text-3xl lg:text-4xl">
            Kế hoạch sản xuất hôm nay
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Nhập tồn thực tế. Hệ thống tính số bánh cần làm, số thau và nguyên liệu cần chuẩn bị.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={createGroup}
            className={`${buttonBase} border border-sand bg-bg-card text-navy hover:bg-bg-soft`}
          >
            <Plus className="h-4 w-4" />
            Thêm nhóm thau
          </button>
          {activeGroup && (
            <button
              type="button"
              onClick={editActiveGroup}
              className={`${buttonBase} border border-navy bg-transparent text-navy hover:bg-bg-soft`}
            >
              <Settings2 className="h-4 w-4" />
              Cấu hình
            </button>
          )}
        </div>
      </header>

      {isConfigOpen && (
        <ProductionGroupEditor
          draft={draft}
          products={products}
          saveState={saveState}
          saveError={saveError}
          onChange={setDraft}
          onClose={() => {
            if (groups.length > 0) setIsConfigOpen(false);
          }}
          onSubmit={saveGroup}
        />
      )}

      {activeGroup && suggestion ? (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-sand bg-bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="min-w-0 flex-1">
              <span className="mb-1.5 block text-sm font-extrabold text-navy">Nhóm đang tính</span>
              <select
                value={selectedGroupId}
                onChange={(event) => {
                  const nextGroupId = event.target.value;
                  const nextGroup = groups.find((group) => group.id === nextGroupId);
                  setSelectedGroupId(nextGroupId);
                  setCompletionDraft(null);
                  setCompletedReferenceId("");
                  setStockByProductId((current) =>
                    stockWithGroupDefaults(current, nextGroup, balanceByKey),
                  );
                }}
                className={inputClass}
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="shrink-0 text-sm text-text-muted sm:max-w-xs sm:text-right">
              Một {activeGroup.batchLabel} cho{" "}
              <strong className="font-extrabold text-navy">
                {formatQuantity(activeGroup.batchCapacity, activeGroup.batchUnit)}
              </strong>
            </div>
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.18fr)] lg:items-start">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-sand bg-bg-card">
              <div className="flex items-start justify-between gap-3 border-b border-sand px-4 py-4 sm:px-5">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-navy">
                    <PackageCheck className="h-5 w-5 text-brand-600" />
                    Tồn thực tế
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-text-muted">
                    Số hệ thống đã được điền sẵn. Sửa lại theo số vừa kiểm đếm.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetSystemStock}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sand text-text-muted hover:bg-bg-soft hover:text-navy active:translate-y-px"
                  aria-label="Lấy lại tồn hệ thống"
                  title="Lấy lại tồn hệ thống"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              <div className="divide-y divide-sand">
                {activeGroup.outputLines.map((output) => {
                  const planned = suggestion.outputs.find(
                    (line) => line.productId === output.productId,
                  );
                  return (
                    <div
                      key={output.productId}
                      className="grid min-w-0 gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_112px] sm:items-center sm:px-5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-navy">
                          {productName(products, output.productId)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-text-muted">
                          Mục tiêu {output.targetQuantity} · đề xuất làm{" "}
                          <span className="text-brand-700">{planned?.plannedQuantity ?? 0}</span>
                        </p>
                      </div>
                      <label>
                        <span className="mb-1 block text-xs font-bold text-text-muted">Đang còn</span>
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={stockByProductId[output.productId] ?? 0}
                          onChange={(event) =>
                            setStockByProductId((current) => ({
                              ...current,
                              [output.productId]: Math.max(0, Number(event.target.value) || 0),
                            }))
                          }
                          className={`${inputClass} tabular-nums`}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="min-w-0 overflow-hidden rounded-2xl border border-sand bg-bg-card">
              <div className="grid gap-4 border-b border-sand bg-bg-soft px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <p className="flex items-center gap-2 text-sm font-extrabold text-text-muted">
                    <Factory className="h-4 w-4 text-brand-600" />
                    Đề xuất hôm nay
                  </p>
                  <p className="mt-2 font-display text-5xl font-bold leading-none tracking-[-0.04em] text-navy tabular-nums">
                    {suggestion.batchCount}
                  </p>
                  <p className="mt-2 text-base font-extrabold text-navy">
                    {suggestion.batchCount === 1 ? activeGroup.batchLabel : `${activeGroup.batchLabel}`}
                  </p>
                </div>
                <div className="text-sm leading-6 text-text-muted sm:text-right">
                  <p>Cần {formatQuantity(suggestion.totalRequiredBatchOutput, activeGroup.batchUnit)}</p>
                  <p>
                    Dư dự kiến{" "}
                    <strong className="font-extrabold text-navy">
                      {formatQuantity(suggestion.surplusQuantity, activeGroup.batchUnit)}
                    </strong>
                  </p>
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-lg font-black text-navy">
                    <Calculator className="h-5 w-5 text-brand-600" />
                    Cần tạo hình
                  </h2>
                  <ProductLabelPrintDialog
                    items={plannedLabelItems}
                    triggerLabel="In tất cả tem"
                    disabled={!plannedLabelItems.some(
                      (item) => (item.defaultQuantity ?? 0) > 0 && Boolean(item.barcode || item.sku),
                    )}
                    triggerClassName={`${buttonBase} min-h-10 border border-sand bg-bg-card px-3 text-xs text-text-secondary hover:bg-bg-soft hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600`}
                  />
                </div>
                <div className="mt-3 divide-y divide-sand border-y border-sand">
                  {suggestion.outputs.map((output) => {
                    const labelItem = plannedLabelItems.find(
                      (item) => item.id === output.productId,
                    );
                    return (
                      <div
                        key={output.productId}
                        className="grid min-w-0 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <span className="min-w-0 truncate text-sm font-bold text-text-secondary">
                          {productName(products, output.productId)}
                        </span>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <strong className="shrink-0 text-lg font-black text-navy tabular-nums">
                            {output.plannedQuantity} cái
                          </strong>
                          {labelItem && (
                            <ProductLabelPrintDialog
                              items={[labelItem]}
                              disabled={
                                output.plannedQuantity <= 0 ||
                                !Boolean(labelItem.barcode || labelItem.sku)
                              }
                              triggerClassName={`${buttonBase} min-h-10 border border-sand bg-bg-card px-3 text-xs text-text-secondary hover:bg-bg-soft hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-sand px-5 py-5">
                <h2 className="flex items-center gap-2 text-lg font-black text-navy">
                  <Wheat className="h-5 w-5 text-brand-600" />
                  Nguyên liệu cần chuẩn bị
                </h2>
                <div className="mt-3 space-y-3">
                  {suggestion.materials.map((material) => {
                    const product = products.find((item) => item.id === material.itemId);
                    const shortage = material.shortageQuantity > 0;
                    return (
                      <div
                        key={inventoryPlanKey(material.itemType, material.itemId)}
                        className="flex min-w-0 items-start justify-between gap-4 border-b border-sand pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-navy">
                            {productName(products, material.itemId)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-text-muted">
                            Đang có {formatQuantity(material.availableQuantity, product?.baseUnit)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-black text-navy tabular-nums">
                            {formatQuantity(material.requiredQuantity, product?.baseUnit)}
                          </p>
                          {shortage && (
                            <p className="mt-1 flex items-center justify-end gap-1 text-xs font-extrabold text-red-700">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Thiếu {formatQuantity(material.shortageQuantity, product?.baseUnit)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-sand bg-bg-soft px-5 py-5">
                {!completionDraft ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-black text-navy">Hoàn tất mẻ từ kế hoạch</h2>
                      <p className="mt-1 text-sm leading-5 text-text-muted">
                        Xác nhận sản lượng thực tế trước khi xuất nguyên liệu và nhập thành phẩm.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openCompletion}
                      disabled={suggestion.batchCount <= 0}
                      className={`${buttonBase} bg-brand-500 text-white hover:bg-brand-600`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Xác nhận sản lượng
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitCompletion} className="space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-black text-navy">Xác nhận sản lượng thực tế</h2>
                        <p className="mt-1 text-sm text-text-muted">
                          Tiêu hao đã được điền theo {completionDraft.batchCount} {activeGroup.batchLabel} đề xuất.
                        </p>
                      </div>
                      {completionState !== "success" && (
                        <button
                          type="button"
                          onClick={() => setCompletionDraft(null)}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sand bg-bg-card text-text-muted hover:text-navy"
                          aria-label="Đóng xác nhận"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-text-muted">
                        Thành phẩm thực tế
                      </p>
                      <div className="space-y-2">
                        {completionDraft.outputs.map((line, index) => (
                          <label key={line.productId} className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3">
                            <span className="min-w-0 text-sm font-bold text-navy">
                              {productName(products, line.productId)}
                              <small className="mt-0.5 block font-semibold text-text-muted">
                                Đề xuất {line.plannedQuantity} cái
                              </small>
                            </span>
                            <input
                              required
                              type="number"
                              min={1}
                              inputMode="numeric"
                              disabled={completionState === "success"}
                              value={line.actualQuantity}
                              onChange={(event) => setCompletionDraft((current) => current ? ({
                                ...current,
                                outputs: current.outputs.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, actualQuantity: Number(event.target.value) || 0 }
                                    : item),
                              }) : current)}
                              className={`${inputClass} tabular-nums`}
                              aria-label={`Sản lượng thực tế ${productName(products, line.productId)}`}
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-sand pt-4">
                      <p className="mb-2 text-xs font-black uppercase tracking-wide text-text-muted">
                        Tiêu hao thực tế
                      </p>
                      <div className="space-y-2">
                        {completionDraft.materials.map((line, index) => {
                          const shortage = suggestion.materials.find(
                            (item) => item.itemType === line.itemType && item.itemId === line.itemId,
                          )?.shortageQuantity ?? 0;
                          const product = products.find((item) => item.id === line.itemId);
                          return (
                            <label key={`${line.itemType}:${line.itemId}`} className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3">
                              <span className="min-w-0 text-sm font-bold text-navy">
                                {productName(products, line.itemId)}
                                <small className="mt-0.5 block font-semibold text-text-muted">
                                  Định mức {formatQuantity(line.plannedQuantity, product?.baseUnit)}
                                  {shortage > 0 && (
                                    <span className="ml-1 text-red-700">
                                      · Thiếu {formatQuantity(shortage, product?.baseUnit)}
                                    </span>
                                  )}
                                </small>
                              </span>
                              <input
                                required
                                type="number"
                                min={1}
                                inputMode="numeric"
                                disabled={completionState === "success"}
                                value={line.actualQuantity}
                                onChange={(event) => setCompletionDraft((current) => current ? ({
                                  ...current,
                                  materials: current.materials.map((item, itemIndex) =>
                                    itemIndex === index
                                      ? { ...item, actualQuantity: Number(event.target.value) || 0 }
                                      : item),
                                }) : current)}
                                className={`${inputClass} tabular-nums`}
                                aria-label={`Tiêu hao thực tế ${productName(products, line.itemId)}`}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <label className="block border-t border-sand pt-4">
                      <span className="mb-1.5 block text-sm font-extrabold text-navy">Ngày sản xuất</span>
                      <input
                        required
                        type="date"
                        disabled={completionState === "success"}
                        value={completionDraft.occurredAt}
                        onChange={(event) => setCompletionDraft((current) =>
                          current ? { ...current, occurredAt: event.target.value } : current)}
                        className={inputClass}
                      />
                    </label>

                    {completionState === "error" && (
                      <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800" role="alert">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {completionError}
                      </p>
                    )}
                    {completionState === "success" ? (
                      <div className="flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2 text-sm font-extrabold text-green-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Đã xuất–nhập tồn kho cho mẻ này.
                        </p>
                        <Link
                          href={`/wholesale/finance/operations?referenceId=${encodeURIComponent(completedReferenceId)}#inventory-transactions`}
                          className={`${buttonBase} border border-green-300 bg-white text-green-800 hover:bg-green-100`}
                        >
                          Xem giao dịch đã tạo
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={completionState === "saving"}
                        className={`${buttonBase} w-full bg-brand-500 text-white hover:bg-brand-600`}
                      >
                        {completionState === "saving" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {completionState === "saving" ? "Đang ghi sổ…" : "Hoàn tất mẻ và ghi sổ kho"}
                      </button>
                    )}
                  </form>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        !isConfigOpen && (
          <div className="rounded-2xl border border-dashed border-sand bg-bg-card px-5 py-12 text-center">
            <Factory className="mx-auto h-8 w-8 text-brand-600" />
            <h2 className="mt-3 text-lg font-black text-navy">Chưa có nhóm sản xuất</h2>
            <p className="mt-1 text-sm text-text-muted">
              Tạo nhóm thau đầu tiên để bắt đầu tính kế hoạch.
            </p>
            <button
              type="button"
              onClick={createGroup}
              className={`${buttonBase} mt-4 bg-brand-500 text-white hover:bg-brand-600`}
            >
              <Plus className="h-4 w-4" />
              Tạo nhóm thau
            </button>
          </div>
        )
      )}
    </div>
  );
}

function ProductionGroupEditor({
  draft,
  products,
  saveState,
  saveError,
  onChange,
  onClose,
  onSubmit,
}: {
  draft: ProductionGroupDraft;
  products: Product[];
  saveState: SaveState;
  saveError: string;
  onChange: (draft: ProductionGroupDraft) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const sourceProducts = products.filter(
    (product) => product.itemType === "ingredient" || product.itemType === "semi_finished",
  );
  const outputProducts = products.filter(
    (product) => product.itemType === "finished_good" || !product.itemType,
  );

  function addInput() {
    const used = new Set(
      draft.inputLines.map((line) => inventoryPlanKey(line.itemType, line.itemId)),
    );
    const product = sourceProducts.find(
      (item) => !used.has(inventoryPlanKey(inventoryTypeForProduct(item), item.id)),
    );
    if (!product) return;
    onChange({
      ...draft,
      inputLines: [
        ...draft.inputLines,
        {
          itemType: inventoryTypeForProduct(product),
          itemId: product.id,
          quantityPerBatch: 1,
        },
      ],
    });
  }

  function addOutput() {
    const used = new Set(draft.outputLines.map((line) => line.productId));
    const product = outputProducts.find((item) => !used.has(item.id));
    if (!product) return;
    onChange({
      ...draft,
      outputLines: [
        ...draft.outputLines,
        { productId: product.id, quantityPerUnit: 1, targetQuantity: 0 },
      ],
    });
  }

  function updateInput(index: number, patch: Partial<ProductionGroupInputLine>) {
    onChange({
      ...draft,
      inputLines: draft.inputLines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-2xl border border-sand bg-bg-card"
      aria-label="Cấu hình nhóm sản xuất"
    >
      <div className="flex items-start justify-between gap-4 border-b border-sand bg-bg-soft px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-lg font-black text-navy">
            {draft.id ? "Sửa nhóm sản xuất" : "Tạo nhóm sản xuất"}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Khai báo một lần định mức của một thau và các loại bánh dùng chung.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sand text-text-muted hover:bg-bg-card hover:text-navy active:translate-y-px"
          aria-label="Đóng cấu hình"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid min-w-0 gap-5 p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:p-5">
        <div className="min-w-0 space-y-4">
          <label>
            <span className="mb-1.5 block text-sm font-extrabold text-navy">Tên nhóm thau</span>
            <input
              required
              value={draft.name}
              onChange={(event) => onChange({ ...draft, name: event.target.value })}
              placeholder="Ví dụ: Thau bánh mì ngọt"
              className={inputClass}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-sm font-extrabold text-navy">Gọi là</span>
              <input
                required
                value={draft.batchLabel}
                onChange={(event) => onChange({ ...draft, batchLabel: event.target.value })}
                placeholder="thau"
                className={inputClass}
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-extrabold text-navy">Đơn vị</span>
              <select
                value={draft.batchUnit}
                onChange={(event) =>
                  onChange({ ...draft, batchUnit: event.target.value as ProductionPlanUnit })
                }
                className={inputClass}
              >
                <option value="gram">Gram</option>
                <option value="millilitre">Millilitre</option>
                <option value="each">Cái</option>
              </select>
            </label>
          </div>
          <label>
            <span className="mb-1.5 block text-sm font-extrabold text-navy">
              Một {draft.batchLabel || "mẻ"} tạo ra
            </span>
            <div className="relative">
              <input
                required
                type="number"
                min={1}
                inputMode="numeric"
                value={draft.batchCapacity}
                onChange={(event) =>
                  onChange({ ...draft, batchCapacity: Number(event.target.value) || 0 })
                }
                className={`${inputClass} pr-14 tabular-nums`}
              />
              <span className="pointer-events-none absolute right-3 top-3 text-sm font-bold text-text-muted">
                {unitLabel(draft.batchUnit)}
              </span>
            </div>
          </label>

          <div className="border-t border-sand pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-navy">Cần cho một {draft.batchLabel || "mẻ"}</h3>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  Chọn nguyên liệu hoặc bán thành phẩm và nhập định mức.
                </p>
              </div>
              <button
                type="button"
                onClick={addInput}
                disabled={draft.inputLines.length >= sourceProducts.length}
                className={`${buttonBase} border border-sand bg-bg-card px-3 text-navy hover:bg-bg-soft`}
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {draft.inputLines.map((line, index) => {
                const source = products.find((product) => product.id === line.itemId);
                return (
                  <div
                    key={`${line.itemType}:${line.itemId}:${index}`}
                    className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_112px_44px]"
                  >
                    <select
                      value={inventoryPlanKey(line.itemType, line.itemId)}
                      onChange={(event) => {
                        const [itemType, ...idParts] = event.target.value.split(":");
                        updateInput(index, {
                          itemType: itemType as ProductionPlanInventoryItemType,
                          itemId: idParts.join(":"),
                        });
                      }}
                      className={inputClass}
                      aria-label={`Nguyên liệu ${index + 1}`}
                    >
                      {sourceProducts.map((product) => (
                        <option
                          key={product.id}
                          value={inventoryPlanKey(inventoryTypeForProduct(product), product.id)}
                        >
                          {product.displayName || product.name}
                        </option>
                      ))}
                    </select>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        required
                        inputMode="numeric"
                        value={line.quantityPerBatch}
                        onChange={(event) =>
                          updateInput(index, {
                            quantityPerBatch: Number(event.target.value) || 0,
                          })
                        }
                        className={`${inputClass} pr-10 tabular-nums`}
                        aria-label={`Định mức nguyên liệu ${index + 1}`}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-3 text-xs font-bold text-text-muted">
                        {unitLabel(source?.baseUnit)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...draft,
                          inputLines: draft.inputLines.filter(
                            (_item, lineIndex) => lineIndex !== index,
                          ),
                        })
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl text-text-muted hover:bg-red-50 hover:text-red-700 active:translate-y-px sm:self-auto"
                      aria-label={`Xóa nguyên liệu ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              {draft.inputLines.length === 0 && (
                <p className="border-y border-dashed border-sand py-4 text-sm text-text-muted">
                  Chưa có nguyên liệu. Nhấn “Thêm” để chọn nguyên liệu đầu tiên.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0 border-t border-sand pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-navy">Các loại bánh tạo hình</h3>
              <p className="mt-1 text-xs leading-5 text-text-muted">
                Mỗi loại cần bao nhiêu bột và mục tiêu cần có trong ngày.
              </p>
            </div>
            <button
              type="button"
              onClick={addOutput}
              disabled={draft.outputLines.length >= outputProducts.length}
              className={`${buttonBase} border border-sand bg-bg-card px-3 text-navy hover:bg-bg-soft`}
            >
              <Plus className="h-4 w-4" />
              Thêm
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {draft.outputLines.map((line, index) => (
              <div
                key={`${line.productId}:${index}`}
                className="grid min-w-0 gap-2 border-b border-sand pb-3 sm:grid-cols-[minmax(0,1fr)_112px_112px_44px]"
              >
                <label>
                  <span className="mb-1 block text-xs font-bold text-text-muted">Thành phẩm</span>
                  <select
                    value={line.productId}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        outputLines: draft.outputLines.map((item, lineIndex) =>
                          lineIndex === index
                            ? { ...item, productId: event.target.value }
                            : item,
                        ),
                      })
                    }
                    className={inputClass}
                  >
                    {outputProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.displayName || product.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-text-muted">
                    {unitLabel(draft.batchUnit)}/cái
                  </span>
                  <input
                    type="number"
                    min={1}
                    required
                    inputMode="numeric"
                    value={line.quantityPerUnit}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        outputLines: draft.outputLines.map((item, lineIndex) =>
                          lineIndex === index
                            ? { ...item, quantityPerUnit: Number(event.target.value) || 0 }
                            : item,
                        ),
                      })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-text-muted">Mục tiêu</span>
                  <input
                    type="number"
                    min={0}
                    required
                    inputMode="numeric"
                    value={line.targetQuantity}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        outputLines: draft.outputLines.map((item, lineIndex) =>
                          lineIndex === index
                            ? { ...item, targetQuantity: Number(event.target.value) || 0 }
                            : item,
                        ),
                      })
                    }
                    className={`${inputClass} tabular-nums`}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      outputLines: draft.outputLines.filter(
                        (_item, lineIndex) => lineIndex !== index,
                      ),
                    })
                  }
                  className="mt-5 grid h-11 w-11 place-items-center rounded-xl text-text-muted hover:bg-red-50 hover:text-red-700 active:translate-y-px"
                  aria-label={`Xóa thành phẩm ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {draft.outputLines.length === 0 && (
              <p className="border-y border-dashed border-sand py-4 text-sm text-text-muted">
                Chưa có thành phẩm. Nhấn “Thêm” để chọn loại bánh đầu tiên.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-sand bg-bg-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-h-5 text-sm font-semibold" aria-live="polite">
          {saveState === "error" && (
            <p className="flex items-center gap-2 text-red-700" role="alert">
              <AlertTriangle className="h-4 w-4" />
              {saveError}
            </p>
          )}
          {saveState === "success" && (
            <p className="flex items-center gap-2 text-green-700">
              <PackageCheck className="h-4 w-4" />
              Đã lưu cấu hình.
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={saveState === "saving" || draft.inputLines.length === 0 || draft.outputLines.length === 0}
          className={`${buttonBase} bg-brand-500 text-white hover:bg-brand-600`}
        >
          {saveState === "saving" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang lưu…
            </>
          ) : saveState === "success" ? (
            <>
              <PackageCheck className="h-4 w-4" />
              Đã lưu
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Lưu cấu hình
            </>
          )}
        </button>
      </div>
    </form>
  );
}
