"use client";

import { Dispatch, FormEvent, ReactNode, SetStateAction, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Factory,
  Loader2,
  Settings2,
  ShoppingCart,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { clsx } from "clsx";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import type { Category, ProductLifecycleStatus } from "@/types";
import type { ProductCostSummary } from "@/features/finance";
import type { ProductFormData } from "../_lib/product-form";
import { ProductBlockSheet, type ProductWorkspaceBlock } from "./ProductBlockSheet";
import { ProductWorkspaceDrawer } from "./ProductWorkspaceDrawer";
import { WorkspaceCardSettingsSection } from "./ProductFormSections";

type WorkspacePanel = ProductWorkspaceBlock | "procurement" | "analytics";

type ProductWorkspaceProps = {
  productId: string;
  categories: Category[];
  formData: ProductFormData;
  error: string | null;
  costingSummary: ProductCostSummary | null;
  isSaving: boolean;
  setFormData: Dispatch<SetStateAction<ProductFormData>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave: () => void;
  onBack: () => void;
  onCostingSummaryChange: () => Promise<void>;
};

const itemTypeLabels = {
  finished_good: "Thành phẩm bán ra",
  ingredient: "Nguyên liệu đầu vào",
  semi_finished: "Bán thành phẩm",
} as const;

const statusLabels: Record<ProductLifecycleStatus, string> = {
  active: "Đang kinh doanh",
  inactive: "Ngừng kinh doanh",
  draft: "Bản nháp",
};

export function ProductWorkspace({
  productId,
  categories,
  formData,
  error,
  costingSummary,
  isSaving,
  setFormData,
  onSubmit,
  onSave,
  onBack,
  onCostingSummaryChange,
}: ProductWorkspaceProps) {
  const [activePanel, setActivePanel] = useState<WorkspacePanel | null>(null);
  const [isCardSettingsOpen, setIsCardSettingsOpen] = useState(false);
  const panels = useMemo(() => getPanels(formData.itemType), [formData.itemType]);
  const ledgerStock = useProductLedgerStock(productId, true);
  const analyticsSummary = useProductAnalytics(productId, 30);

  useEffect(() => {
    if (activePanel && !panels.some((panel) => panel.id === activePanel)) {
      setActivePanel(null);
    }
  }, [activePanel, panels]);

  const categoryName = categories.find((item) => item.id === formData.categoryId)?.name;
  const margin = getMargin(formData, costingSummary);
  const activePanelInfo = panels.find((panel) => panel.id === activePanel);
  const editableBlock = activePanel && isEditableBlock(activePanel) ? activePanel : null;
  const isDrawerOpen = activePanel !== null || isCardSettingsOpen;
  const drawerSectionLabel = activePanelInfo?.label ?? "Sản phẩm";

  const updateLifecycleStatus = (lifecycleStatus: ProductLifecycleStatus) => {
    setFormData((current) => ({
      ...current,
      lifecycleStatus,
      isAvailable: lifecycleStatus === "active" ? current.isAvailable : false,
    }));
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 bg-[linear-gradient(135deg,_#ffffff,_#fafafa)] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onBack} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:border-brand-200 hover:text-brand-600" aria-label="Quay lại kho sản phẩm"><ArrowLeft className="h-4 w-4" /></button>
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"><ProductImage src={formData.imageUrl} alt={formData.name || "Sản phẩm"} /></div>
            <div className="min-w-0"><h1 className="truncate text-lg font-black tracking-tight text-neutral-950">{formData.name || "Sản phẩm chưa đặt tên"}</h1><p className="mt-0.5 truncate text-xs font-semibold text-neutral-400">SKU {formData.sku || "Chưa thiết lập"}{categoryName ? ` · ${categoryName}` : ""}</p></div>
            <div className="hidden items-center gap-4 border-l border-neutral-200 pl-4 xl:flex"><HeaderMetric label="Giá" value={formatCurrency(formData.price)} /><HeaderMetric label="Biên" value={`${margin.toFixed(1)}%`} tone={margin < formData.targetGrossMarginPercent ? "warning" : "positive"} /><HeaderMetric label="Tồn" value={`${ledgerStock.hasLedger ? ledgerStock.quantity : formData.stock ?? 0}`} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <select value={formData.itemType} onChange={(event) => setFormData((current) => ({ ...current, itemType: event.target.value as ProductFormData["itemType"] }))} className="h-8 max-w-40 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-bold text-neutral-700 outline-none focus:border-brand-500"><option value="finished_good">Thành phẩm</option><option value="semi_finished">Bán thành phẩm</option><option value="ingredient">Nguyên liệu</option></select>
            <select value={formData.lifecycleStatus} onChange={(event) => updateLifecycleStatus(event.target.value as ProductLifecycleStatus)} className="h-8 max-w-36 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-bold text-neutral-700 outline-none focus:border-brand-500">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button type="button" onClick={onBack} className="h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-xs font-bold text-neutral-600 transition hover:bg-neutral-50">Hủy</button>
            <button type="button" onClick={onSave} disabled={isSaving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Lưu</button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-4 px-1"><div><h2 className="text-base font-black text-neutral-950">Không gian quản lý sản phẩm</h2><p className="mt-0.5 text-sm text-neutral-500">Mỗi khối là một không gian làm việc độc lập.</p></div><span className="hidden text-xs font-semibold text-neutral-400 sm:block">Chọn khối để mở sheet chuyên biệt</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {panels.map((panel) => <WorkspaceCard key={panel.id} panel={panel} formData={formData} costingSummary={costingSummary} margin={margin} ledgerStock={ledgerStock} analyticsSummary={analyticsSummary} onClick={() => setActivePanel(panel.id)} />)}
        </div>
      </section>

      <ProductWorkspaceDrawer
        isOpen={isDrawerOpen}
        title={drawerSectionLabel}
        onClose={() => { setActivePanel(null); setIsCardSettingsOpen(false); }}
        header={<DrawerHeader formData={formData} sectionLabel={drawerSectionLabel} onOpenSettings={activePanel ? () => setIsCardSettingsOpen(true) : undefined} />}
      >
        {isCardSettingsOpen && activePanel && activePanelInfo ? (
          <form id="sales-card-settings-form" onSubmit={onSubmit} className="mx-auto w-full max-w-4xl px-5 py-5 sm:px-7"><WorkspaceCardSettingsSection cardId={activePanel} cardLabel={activePanelInfo.label} defaultDescription={activePanelInfo.description} formData={formData} setFormData={setFormData} /></form>
        ) : editableBlock ? (
          <ProductBlockSheet
            key={editableBlock}
            block={editableBlock}
            productId={productId}
            categories={categories}
            formData={formData}
            error={error}
            costingSummary={costingSummary}
            setFormData={setFormData}
            onSubmit={onSubmit}
            onCostingSummaryChange={onCostingSummaryChange}
          />
        ) : activePanel === "analytics" ? <AnalyticsSheet productId={productId} ledgerStock={ledgerStock} /> : <ProcurementSheet />}
      </ProductWorkspaceDrawer>
    </div>
  );
}

type DashboardPanel = { id: WorkspacePanel; label: string; description: string; icon: ReactNode };

function getPanels(itemType: ProductFormData["itemType"]): DashboardPanel[] {
  const shared: DashboardPanel[] = [
    { id: "finance", label: "Tài chính", description: "Giá vốn, COGS và biên lợi nhuận.", icon: <WalletCards /> },
    { id: "logistics", label: "Kho vận", description: "Tồn, mã hàng và khả năng phục vụ.", icon: <Warehouse /> },
    { id: "analytics", label: "Thống kê", description: "Các chỉ số vận hành theo sản phẩm.", icon: <BarChart3 /> },
  ];
  if (itemType === "ingredient") return [{ id: "procurement", label: "Mua hàng", description: "Nhập mua, chứng từ và giá vốn thực tế.", icon: <ShoppingCart /> }, ...shared];
  if (itemType === "semi_finished") return [{ id: "production", label: "Sản xuất & BOM", description: "Định mức và kế hoạch sản xuất.", icon: <Factory /> }, ...shared];
  return [
    { id: "sales", label: "Bán hàng", description: "Nội dung, giá, ảnh và biến thể.", icon: <ShoppingCart /> },
    { id: "production", label: "Sản xuất & BOM", description: "Định mức và kế hoạch sản xuất.", icon: <Factory /> },
    ...shared,
  ];
}

function isEditableBlock(panel: WorkspacePanel): panel is ProductWorkspaceBlock {
  return panel === "sales" || panel === "production" || panel === "finance" || panel === "logistics";
}

function WorkspaceCard({ panel, formData, costingSummary, margin, ledgerStock, analyticsSummary, onClick }: { panel: DashboardPanel; formData: ProductFormData; costingSummary: ProductCostSummary | null; margin: number; ledgerStock: LedgerStockState; analyticsSummary: ProductAnalyticsState; onClick: () => void }) {
  const content = getCardContent(panel.id, formData, costingSummary, margin, analyticsSummary.data);
  const displayedContent = panel.id === "logistics" && ledgerStock.hasLedger
    ? { value: `${ledgerStock.quantity} tồn`, caption: "Theo sổ kho vận hành" }
    : panel.id === "logistics"
      ? { ...content, caption: "Chưa khởi tạo sổ kho" }
      : content;
  const cardConfig = formData.workspaceCards[panel.id];
  const illustrationUrl = cardConfig?.illustrationUrl;
  const hasIllustration = Boolean(illustrationUrl);
  const description = cardConfig?.description?.trim() || panel.description;
  const palette = getCardPalette(panel.id);

  return (
    <button type="button" onClick={onClick} className={clsx("group relative min-h-48 overflow-hidden rounded-2xl border bg-gradient-to-br p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2", palette.card)}>
      {hasIllustration ? (
        <><div className="absolute inset-y-0 right-0 w-[42%] bg-neutral-100"><ProductImage src={illustrationUrl} alt={`Minh họa ${panel.label}`} /></div><div className={clsx("absolute inset-y-0 right-[37%] w-16 bg-gradient-to-r via-white/85 to-transparent", palette.imageFade)} /></>
      ) : <div className={clsx("absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full transition group-hover:scale-125", palette.decoration)} />}
      <div className={clsx("relative flex h-full flex-col", hasIllustration ? "max-w-[61%]" : "") }>
        <span className={clsx("grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm [&>svg]:h-5 [&>svg]:w-5", palette.icon)}>{panel.icon}</span>
        <div className="mt-5"><h3 className="font-black text-neutral-950">{panel.label}</h3><p className="mt-1 line-clamp-3 text-sm leading-5 text-neutral-500">{description}</p></div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5"><div><div className={clsx("text-lg font-black", displayedContent.warning ? "text-amber-600" : palette.metric)}>{displayedContent.value}</div><div className="mt-0.5 text-xs font-semibold text-neutral-400">{displayedContent.caption}</div></div><ChevronRight className={clsx("h-5 w-5 transition group-hover:translate-x-1", palette.arrow)} /></div>
      </div>
    </button>
  );
}

type LedgerBalance = { itemType: string; itemId: string; quantity: number };
type LedgerStockState = { hasLedger: boolean; quantity: number };

function useProductLedgerStock(productId: string, enabled: boolean): LedgerStockState {
  const [state, setState] = useState({ hasLedger: false, quantity: 0 });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/admin/finance/inventory/balances?itemType=product&itemId=${encodeURIComponent(productId)}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const balances = await response.json() as LedgerBalance[];
        const productBalances = balances.filter((balance) => balance.itemType === "product" && balance.itemId === productId);
        if (!cancelled) {
          setState({
            hasLedger: productBalances.length > 0,
            quantity: productBalances.reduce((total, balance) => total + Number(balance.quantity || 0), 0),
          });
        }
      } catch {
        if (!cancelled) setState({ hasLedger: false, quantity: 0 });
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [enabled, productId]);

  return state;
}

function getCardContent(panel: WorkspacePanel, formData: ProductFormData, costingSummary: ProductCostSummary | null, margin: number, analytics?: ProductAnalytics | null) {
  const cost = getCost(formData, costingSummary);
  switch (panel) {
    case "sales": return { value: formatCurrency(formData.price), caption: `${formData.sizeOptions.length + formData.flavorOptions.length} tuỳ chọn` };
    case "production": {
      const processCaption = `${formData.productionSteps?.length ?? 0} công đoạn${formData.manufacturingLeadMinutes ? ` · ${formData.manufacturingLeadMinutes} phút` : ""}`;
      return costingSummary?.recipe
        ? { value: `BOM v${costingSummary.recipe.version}`, caption: `${costingSummary.recipe.yieldQuantity} ${formData.manufacturingOutputUnit || "cái"} / mẻ · ${processCaption}` }
        : { value: "Chưa có BOM", caption: processCaption || "Thiết lập định mức" };
    }
    case "finance": return { value: `${margin.toFixed(1)}%`, caption: `Biên gộp · COGS ${formatCurrency(cost)}`, warning: margin < formData.targetGrossMarginPercent };
    case "logistics": return { value: `${formData.stock ?? 0} tồn`, caption: formData.storage || "Chưa thiết lập bảo quản" };
    case "procurement": return { value: "Nhập mua", caption: "Mở nghiệp vụ kho" };
    case "analytics": return analytics ? { value: `${analytics.soldQuantity} đã bán`, caption: `30 ngày · ${formatCurrency(analytics.revenue)}` } : { value: "Đang tải", caption: "Giao dịch 30 ngày" };
  }
}

function getCardPalette(panel: WorkspacePanel) {
  switch (panel) {
    case "sales": return { card: "border-brand-100 from-white to-brand-50/70 hover:border-brand-300", icon: "bg-brand-600", metric: "text-brand-700", arrow: "text-brand-300 group-hover:text-brand-600", decoration: "bg-brand-100", imageFade: "from-brand-50" };
    case "production": return { card: "border-amber-100 from-white to-amber-50/70 hover:border-amber-300", icon: "bg-amber-600", metric: "text-amber-700", arrow: "text-amber-300 group-hover:text-amber-600", decoration: "bg-amber-100", imageFade: "from-amber-50" };
    case "finance": return { card: "border-blue-100 from-white to-blue-50/70 hover:border-blue-300", icon: "bg-blue-600", metric: "text-blue-700", arrow: "text-blue-300 group-hover:text-blue-600", decoration: "bg-blue-100", imageFade: "from-blue-50" };
    case "logistics": return { card: "border-teal-100 from-white to-teal-50/70 hover:border-teal-300", icon: "bg-teal-600", metric: "text-teal-700", arrow: "text-teal-300 group-hover:text-teal-600", decoration: "bg-teal-100", imageFade: "from-teal-50" };
    case "procurement": return { card: "border-orange-100 from-white to-orange-50/70 hover:border-orange-300", icon: "bg-orange-600", metric: "text-orange-700", arrow: "text-orange-300 group-hover:text-orange-600", decoration: "bg-orange-100", imageFade: "from-orange-50" };
    case "analytics": return { card: "border-sky-100 from-white to-sky-50/70 hover:border-sky-300", icon: "bg-sky-600", metric: "text-sky-700", arrow: "text-sky-300 group-hover:text-sky-600", decoration: "bg-sky-100", imageFade: "from-sky-50" };
  }
}

export function WorkspaceHeader({ formData, sectionLabel, isSaving, setFormData, onStatusChange, onOpenSettings, onCancel, formId }: { formData: ProductFormData; sectionLabel: string; isSaving: boolean; setFormData: Dispatch<SetStateAction<ProductFormData>>; onStatusChange: (status: ProductLifecycleStatus) => void; onOpenSettings?: () => void; onCancel: () => void; formId: string | null }) {
  return (
    <header className="relative shrink-0 border-b border-neutral-200 bg-white px-4 py-3 sm:px-5">
      {onOpenSettings && (
        <button type="button" onClick={onOpenSettings} className="absolute right-14 top-3 grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-950" aria-label={`Thiết lập ${sectionLabel}`}>
          <Settings2 className="h-4 w-4" />
        </button>
      )}
      <div className="mr-24 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"><ProductImage src={formData.imageUrl} alt={formData.name || "Sản phẩm"} /></div>
          <div className="min-w-0"><p className="truncate text-base font-black text-neutral-950">{formData.name || "Sản phẩm chưa đặt tên"}<span className="mx-1.5 text-neutral-300">|</span><span className="text-brand-600 underline decoration-2 underline-offset-4">{sectionLabel}</span></p><p className="mt-1 truncate text-xs font-semibold text-neutral-400">SKU {formData.sku || "Chưa thiết lập"}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={formData.itemType} onChange={(event) => setFormData((current) => ({ ...current, itemType: event.target.value as ProductFormData["itemType"] }))} className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-bold text-neutral-700 outline-none focus:border-neutral-950">{Object.entries(itemTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select value={formData.lifecycleStatus} onChange={(event) => onStatusChange(event.target.value as ProductLifecycleStatus)} className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs font-bold text-neutral-700 outline-none focus:border-neutral-950">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-neutral-200 px-3 text-xs font-bold text-neutral-600 transition hover:bg-neutral-50">Hủy</button>
          {formId && <button type="submit" form={formId} disabled={isSaving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-xs font-bold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-45">{isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Lưu</button>}
        </div>
      </div>
    </header>
  );
}

type ProductAnalytics = {
  days: number;
  inventoryQuantity: number;
  hasLedger: boolean;
  soldQuantity: number;
  revenue: number;
  deliveryQuantity: number;
  reservedQuantity: number;
  productionQuantity: number;
  workInProgressAvailable: boolean;
  variants: Array<{ label: string; quantity: number; revenue: number }>;
  recentMovements: Array<{ id: string; type: string; direction: "in" | "out"; quantity: number; occurredAt: string }>;
  recentOrders: Array<{ id: string; orderNumber: string; status: string; quantity: number; occurredAt: string }>;
};

type ProductAnalyticsState = { data: ProductAnalytics | null; isLoading: boolean };

function useProductAnalytics(productId: string, days: number): ProductAnalyticsState {
  const [state, setState] = useState<ProductAnalyticsState>({ data: null, isLoading: true });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState((current) => ({ ...current, isLoading: true }));
      try {
        const response = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/analytics?days=${days}`, { cache: "no-store" });
        if (!response.ok) throw new Error("PRODUCT_ANALYTICS_UNAVAILABLE");
        const data = await response.json() as ProductAnalytics;
        if (!cancelled) setState({ data, isLoading: false });
      } catch {
        if (!cancelled) setState({ data: null, isLoading: false });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [days, productId]);

  return state;
}

function DrawerHeader({ formData, sectionLabel, onOpenSettings }: { formData: ProductFormData; sectionLabel: string; onOpenSettings?: () => void }) {
  return <header className="relative shrink-0 border-b border-neutral-200 bg-white px-5 py-3"><div className="mr-12 flex min-w-0 items-center gap-3"><div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50"><ProductImage src={formData.imageUrl} alt={formData.name || "Sản phẩm"} /></div><div className="min-w-0"><p className="truncate text-base font-black text-neutral-950">{formData.name || "Sản phẩm chưa đặt tên"}<span className="mx-1.5 text-neutral-300">|</span><span className="text-brand-600 underline decoration-2 underline-offset-4">{sectionLabel}</span></p><p className="mt-1 truncate text-xs font-semibold text-neutral-400">SKU {formData.sku || "Chưa thiết lập"}</p></div></div>{onOpenSettings && <button type="button" onClick={onOpenSettings} className="absolute right-14 top-3 grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-950" aria-label={`Thiết lập ${sectionLabel}`}><Settings2 className="h-4 w-4" /></button>}</header>;
}

function AnalyticsSheet({ productId, ledgerStock }: { productId: string; ledgerStock: LedgerStockState }) {
  const [days, setDays] = useState(30);
  const analytics = useProductAnalytics(productId, days);
  const data = analytics.data;
  const inventoryQuantity = data?.hasLedger ? data.inventoryQuantity : ledgerStock.hasLedger ? ledgerStock.quantity : 0;
  const metrics = [
    { label: "Tồn khả dụng", value: `${inventoryQuantity}`, hint: data?.hasLedger || ledgerStock.hasLedger ? "Theo sổ kho" : "Chưa có sổ kho" },
    { label: "Đang chờ giao", value: `${data?.deliveryQuantity ?? 0}`, hint: `${data?.reservedQuantity ?? 0} đã giữ chỗ` },
    { label: `Đã bán ${days} ngày`, value: `${data?.soldQuantity ?? 0}`, hint: data ? formatCurrency(data.revenue) : "Đang tải giao dịch" },
    { label: "Nhập thành phẩm", value: `${data?.productionQuantity ?? 0}`, hint: `${days} ngày gần đây` },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Transactional data</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">Thống kê giao dịch</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Số liệu được tổng hợp từ đơn hàng, sổ kho và mẻ sản xuất đã hoàn thành của riêng sản phẩm này.</p>
        </div>
        <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
          {[7, 30, 90].map((value) => <button key={value} type="button" onClick={() => setDays(value)} className={clsx("rounded-md px-3 py-1.5 text-xs font-bold transition", days === value ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-100")}>{value} ngày</button>)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <div key={metric.label} className="rounded-xl border border-neutral-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wide text-neutral-400">{metric.label}</p><p className="mt-2 text-2xl font-black text-neutral-950">{analytics.isLoading ? "—" : metric.value}</p><p className="mt-1 text-xs text-neutral-500">{metric.hint}</p></div>)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h4 className="font-black text-neutral-950">Biến thể bán chạy</h4><p className="mt-1 text-xs text-neutral-500">Theo số lượng đã hoàn tất trong {days} ngày.</p></div><Link href="/admin/orders" className="text-xs font-bold text-brand-600 hover:text-brand-700">Xem đơn hàng</Link></div>{data?.variants.length ? <div className="mt-4 space-y-3">{data.variants.map((variant) => <div key={variant.label} className="flex items-center justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-800">{variant.label}</p><p className="mt-0.5 text-xs text-neutral-400">{formatCurrency(variant.revenue)}</p></div><span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-black text-brand-700">{variant.quantity} bán</span></div>)}</div> : <EmptyAnalytics text={analytics.isLoading ? "Đang tổng hợp biến thể…" : "Chưa có đơn hoàn tất trong khoảng thời gian này."} />}</section>
        <section className="rounded-xl border border-neutral-200 bg-white p-4"><div><h4 className="font-black text-neutral-950">Sản xuất</h4><p className="mt-1 text-xs text-neutral-500">Mẻ hoàn thành được tính ở chỉ số “Nhập thành phẩm”.</p></div><div className="mt-4 rounded-lg border border-dashed border-amber-200 bg-amber-50/60 p-3"><p className="text-sm font-bold text-amber-900">Chưa theo dõi WIP</p><p className="mt-1 text-xs leading-5 text-amber-800">Chưa có lệnh sản xuất hoặc mẻ đang làm trong dữ liệu, nên hệ thống không hiển thị số “đang sản xuất” giả.</p></div><Link href="/admin/finance/operations" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-950">Xem mẻ đã hoàn thành <ChevronRight className="h-3.5 w-3.5" /></Link></section>
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-black text-neutral-950">Hoạt động gần đây</h4><p className="mt-1 text-xs text-neutral-500">Đơn có sản phẩm này và biến động kho trong {days} ngày.</p></div><div className="flex gap-2"><Link href="/admin/orders" className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50">Đơn hàng</Link><Link href="/admin/finance/operations" className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-50">Sổ kho</Link></div></div>{data?.recentOrders.length || data?.recentMovements.length ? <div className="mt-4 divide-y divide-neutral-100">{data.recentOrders.map((order) => <ActivityRow key={`order:${order.id}`} label={`Đơn ${order.orderNumber}`} detail={`${order.quantity} sản phẩm · ${order.status}`} occurredAt={order.occurredAt} />)}{data.recentMovements.map((movement) => <ActivityRow key={`movement:${movement.id}`} label={movementLabel(movement.type)} detail={`${movement.direction === "in" ? "+" : "−"}${movement.quantity}`} occurredAt={movement.occurredAt} positive={movement.direction === "in"} />)}</div> : <EmptyAnalytics text={analytics.isLoading ? "Đang tải hoạt động…" : "Chưa có hoạt động trong khoảng thời gian này."} />}</section>
    </div>
  );
}

function ActivityRow({ label, detail, occurredAt, positive }: { label: string; detail: string; occurredAt: string; positive?: boolean }) {
  return <div className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold text-neutral-800">{label}</p><p className="mt-0.5 text-xs text-neutral-400">{new Date(occurredAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</p></div><span className={clsx("text-sm font-bold", positive ? "text-teal-700" : "text-neutral-600")}>{detail}</span></div>;
}

function EmptyAnalytics({ text }: { text: string }) {
  return <div className="mt-4 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-5 text-center text-sm text-neutral-500">{text}</div>;
}

function movementLabel(type: string) {
  const labels: Record<string, string> = { purchase_receipt: "Nhập mua", production_issue: "Xuất sản xuất", production_output: "Nhập thành phẩm", sale: "Xuất bán", waste: "Hao hụt", adjustment: "Điều chỉnh" };
  return labels[type] ?? "Biến động kho";
}

function ProcurementSheet() {
  return <div className="mx-auto w-full max-w-4xl space-y-5 p-5 sm:p-7"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-400">Procurement</p><h3 className="mt-2 text-2xl font-black tracking-tight text-neutral-950">Mua hàng nguyên liệu</h3><p className="mt-2 text-sm leading-6 text-neutral-500">Phiếu nhập mua được quản lý tập trung để cập nhật tồn và giá vốn bình quân.</p></div><Link href="/admin/finance/operations" className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800">Mở nghiệp vụ nhập mua <ChevronRight className="h-4 w-4" /></Link><p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">Hồ sơ nhà cung cấp, MOQ và lead-time sẽ xuất hiện tại đây khi danh mục nhà cung cấp được bổ sung vào Finance.</p></div>;
}

function HeaderMetric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "warning" }) { return <div><p className="text-[11px] font-bold uppercase tracking-wide text-neutral-400">{label}</p><p className={clsx("mt-0.5 font-black", tone === "warning" ? "text-amber-600" : tone === "positive" ? "text-emerald-600" : "text-neutral-950")}>{value}</p></div>; }
function getCost(formData: ProductFormData, costingSummary: ProductCostSummary | null) { return costingSummary?.source === "recipe" ? costingSummary.totalCost : Math.round((formData.ingredientsCost + formData.packagingCost + formData.laborCost + formData.overheadCost) * (1 + Math.max(0, formData.wastePercent) / 100)); }
function getMargin(formData: ProductFormData, costingSummary: ProductCostSummary | null) { return formData.price <= 0 ? 0 : Math.max(0, ((formData.price - getCost(formData, costingSummary)) / formData.price) * 100); }
function formatCurrency(value: number) { return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value); }
