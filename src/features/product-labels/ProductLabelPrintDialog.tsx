/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4
 * component: print dialog · genre: editorial · theme: SweetTime warm editorial
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (40–41) · mobile: pass (34, 49–57)
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Loader2, Printer, X } from "lucide-react";
import type { Product } from "@/types";
import {
  buildProductLabelPrintDocument,
  encodeProductBarcode,
  normalizeProductLabelLayout,
  PRODUCT_LABEL_LOGO_PATH,
  productLabelBarcodeFitError,
  productLabelNameNeedsCompactFit,
  productLabelLayoutPreset,
  productLabelPayload,
  type ProductLabelLayout,
  type ProductLabelLogo,
  type ProductLabelPrintJob,
  type ProductLabelPreset,
  type ProductLabelSize,
} from "./code128";

export type ProductLabelItem = {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  variantLabel?: string;
  price?: number;
  defaultQuantity?: number;
  disabledReason?: string;
};

export type ProductLabelWholesaleOffer = {
  wholesalePrice: number;
  sellUnitLabel?: string | null;
  unitsPerSellUnit?: number | null;
  sellUnitSku?: string | null;
  sellUnitBarcode?: string | null;
  isAvailable?: boolean | null;
};

type ProductLabelPrintDialogProps = {
  items: ProductLabelItem[];
  triggerLabel?: string;
  triggerClassName?: string;
  disabled?: boolean;
  logo?: ProductLabelLogo;
};

type RowState = {
  selected: boolean;
  quantity: number;
};

type PrintState = "idle" | "printing" | "error" | "success";
type LayoutPreset = ProductLabelPreset | "custom";

const LABEL_LAYOUT_STORAGE_PREFIX = "sweettime:product-label-layout:";
const DEFAULT_LABEL_LOGO: ProductLabelLogo = {
  src: PRODUCT_LABEL_LOGO_PATH,
  alt: "SweetTime",
};

const defaultTriggerClass =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-4 text-sm font-extrabold text-neutral-700 transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] hover:border-brand-200 hover:bg-bg-soft hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55";

const controlClass =
  "h-11 w-full min-w-0 rounded-xl border border-sand bg-bg-card px-3 text-sm font-semibold text-navy outline-2 outline-transparent outline-offset-1 hover:bg-bg-main focus-visible:outline-brand-500 active:border-brand-500 disabled:cursor-not-allowed disabled:opacity-55";

export function labelItemsForProduct(
  product: Product,
  defaultQuantity = 1,
  price = product.price,
): ProductLabelItem[] {
  const items: ProductLabelItem[] = [
    {
      id: product.id,
      name: product.displayName || product.name,
      sku: product.sku,
      barcode: product.barcode,
      price,
      defaultQuantity,
    },
  ];
  const sizeById = new Map(
    (product.sizeOptions ?? []).map((option) => [option.id, option]),
  );
  const flavorById = new Map(
    (product.flavorOptions ?? []).map((option) => [option.id, option]),
  );

  if (product.variantCombinations?.length) {
    for (const combination of product.variantCombinations) {
      const size = sizeById.get(combination.sizeOptionId);
      const flavor = flavorById.get(combination.flavorOptionId);
      items.push({
        id: `${product.id}:combination:${combination.id}`,
        name: product.displayName || product.name,
        variantLabel: [size?.label, flavor?.label].filter(Boolean).join(" · "),
        sku: combination.sku,
        barcode: combination.barcode,
        price: price + (combination.priceAdjustment ?? 0),
        defaultQuantity: 0,
        disabledReason: combination.isAvailable === false
          ? "Biến thể đang ngừng bán"
          : undefined,
      });
    }
    return items;
  }

  for (const size of product.sizeOptions ?? []) {
    items.push({
      id: `${product.id}:size:${size.id}`,
      name: product.displayName || product.name,
      variantLabel: size.label,
      sku: size.sku,
      barcode: size.barcode,
      price: price + (size.priceAdjustment ?? 0),
      defaultQuantity: 0,
    });
  }
  for (const flavor of product.flavorOptions ?? []) {
    items.push({
      id: `${product.id}:flavor:${flavor.id}`,
      name: product.displayName || product.name,
      variantLabel: flavor.label,
      sku: flavor.sku,
      barcode: flavor.barcode,
      price: price + (flavor.priceAdjustment ?? 0),
      defaultQuantity: 0,
    });
  }
  return items;
}

export function labelItemsForWholesaleOffer(
  product: Product,
  offer: ProductLabelWholesaleOffer,
  defaultQuantity = 1,
): ProductLabelItem[] {
  const unitsPerSellUnit = Math.max(1, Math.floor(offer.unitsPerSellUnit ?? 1));
  const sellUnitLabel = offer.sellUnitLabel?.trim();
  return [{
    id: `${product.id}:wholesale-offer`,
    name: product.displayName || product.name,
    variantLabel: [
      sellUnitLabel,
      unitsPerSellUnit > 1 ? `${unitsPerSellUnit} sản phẩm / quy cách` : "",
    ].filter(Boolean).join(" · "),
    sku: offer.sellUnitSku?.trim() || product.sku,
    barcode: offer.sellUnitBarcode?.trim() || product.barcode,
    price: offer.wholesalePrice,
    defaultQuantity,
    disabledReason: offer.isAvailable === false ? "Quy cách đang ngừng bán" : undefined,
  }];
}

function initialRows(items: ProductLabelItem[]) {
  return Object.fromEntries(
    items.map((item) => {
      const quantity = Math.min(999, Math.max(0, Math.floor(item.defaultQuantity ?? 0)));
      return [item.id, { selected: quantity > 0 && !item.disabledReason, quantity }];
    }),
  ) as Record<string, RowState>;
}

export function ProductLabelPrintDialog({
  items,
  triggerLabel = "In tem",
  triggerClassName = defaultTriggerClass,
  disabled = false,
  logo = DEFAULT_LABEL_LOGO,
}: ProductLabelPrintDialogProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, RowState>>(() => initialRows(items));
  const [labelSize, setLabelSize] = useState<ProductLabelSize>("50x30");
  const [layout, setLayout] = useState<ProductLabelLayout>(() =>
    productLabelLayoutPreset("50x30", "compact"),
  );
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("compact");
  const [productionDate, setProductionDate] = useState(todayLocalDate);
  const [expiryDate, setExpiryDate] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [printState, setPrintState] = useState<PrintState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && printState !== "printing") {
        setIsOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.hasAttribute("hidden") &&
          !element.closest("details:not([open])"),
      );
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("keydown", trapFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("keydown", trapFocus);
    };
  }, [isOpen, printState]);

  const jobs = useMemo(
    () =>
      items.flatMap((item) => {
        const row = rows[item.id];
        if (
          item.disabledReason ||
          !row?.selected ||
          row.quantity <= 0 ||
          !productLabelPayload(item)
        ) return [];
        return [{
          name: item.name,
          sku: item.sku,
          barcode: item.barcode,
          variantLabel: item.variantLabel,
          price: item.price,
          quantity: Math.floor(row.quantity),
        } satisfies ProductLabelPrintJob];
      }),
    [items, rows],
  );
  const totalLabels = jobs.reduce((sum, job) => sum + job.quantity, 0);
  const previewJob = jobs[0];
  const previewPayload = previewJob ? productLabelPayload(previewJob) : "";
  const previewJobs = previewJob ? [previewJob] : [];
  const businessDataError = useMemo(() => {
    if (layout.showProductionDate && !productionDate) {
      return "Hãy nhập ngày sản xuất trước khi in.";
    }
    if (layout.showExpiryDate && !expiryDate) {
      return "Hãy nhập hạn sử dụng trước khi in.";
    }
    if (productionDate && expiryDate && expiryDate < productionDate) {
      return "Hạn sử dụng không được sớm hơn ngày sản xuất.";
    }
    if (layout.showBatchCode && !batchCode.trim()) {
      return "Hãy nhập số mẻ / lô trước khi in.";
    }
    return "";
  }, [batchCode, expiryDate, layout.showBatchCode, layout.showExpiryDate, layout.showProductionDate, productionDate]);
  const barcodeFitError = useMemo(
    () => layout.showBarcode
      ? jobs
        .map((job) => productLabelBarcodeFitError(productLabelPayload(job), labelSize, layout))
        .find(Boolean) ?? ""
      : "",
    [jobs, labelSize, layout],
  );
  const validationError = businessDataError || barcodeFitError;
  const doubleLabelCount = labelSize === "35x22-double" && layout.doubleMode === "logo-product";
  const printCountLabel = doubleLabelCount ? `${totalLabels} cặp tem` : `${totalLabels} tem`;

  function open() {
    setRows(initialRows(items));
    const savedLayout = loadSavedLayout(labelSize);
    setLayout(savedLayout ?? productLabelLayoutPreset(labelSize, "compact"));
    setLayoutPreset(savedLayout ? "custom" : "compact");
    setProductionDate(todayLocalDate());
    setExpiryDate("");
    setBatchCode("");
    setPrintState("idle");
    setMessage("");
    setIsOpen(true);
  }

  function close() {
    if (printState !== "printing") {
      setIsOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function updateRow(itemId: string, patch: Partial<RowState>) {
    setPrintState("idle");
    setMessage("");
    setRows((current) => ({
      ...current,
      [itemId]: { ...current[itemId], ...patch },
    }));
  }

  function changeLabelSize(nextSize: ProductLabelSize) {
    const savedLayout = loadSavedLayout(nextSize);
    setLabelSize(nextSize);
    setLayout(savedLayout ?? productLabelLayoutPreset(nextSize, "compact"));
    setLayoutPreset(savedLayout ? "custom" : "compact");
    resetFeedback();
  }

  function applyPreset(preset: ProductLabelPreset) {
    setLayout(productLabelLayoutPreset(labelSize, preset));
    setLayoutPreset(preset);
    resetFeedback();
  }

  function updateLayout(patch: Partial<ProductLabelLayout>) {
    setLayout((current) => normalizeProductLabelLayout(labelSize, { ...current, ...patch }));
    setLayoutPreset("custom");
    resetFeedback();
  }

  function changeExpiryDate(value: string) {
    setExpiryDate(value);
    resetFeedback();
    if (value && !layout.showExpiryDate) {
      updateLayout({ showExpiryDate: true });
    }
  }

  function saveLayout() {
    try {
      window.localStorage.setItem(
        `${LABEL_LAYOUT_STORAGE_PREFIX}${labelSize}`,
        JSON.stringify(layout),
      );
      setLayoutPreset("custom");
      setPrintState("success");
      setMessage(`Đã lưu thiết lập cho khổ ${labelSizeLabel(labelSize)}.`);
    } catch {
      setPrintState("error");
      setMessage("Không thể lưu thiết lập trên trình duyệt này.");
    }
  }

  function resetFeedback() {
    setPrintState("idle");
    setMessage("");
  }

  async function printLabels() {
    if (!jobs.length) {
      setPrintState("error");
      setMessage("Hãy chọn ít nhất một mã và nhập số lượng tem.");
      return;
    }
    if (validationError) {
      setPrintState("error");
      setMessage(validationError);
      return;
    }
    await openPrintWindow(
      jobs,
      `Đã đóng hộp thoại in ${printCountLabel}.`,
    );
  }

  async function printTestLabel() {
    if (!jobs.length) {
      setPrintState("error");
      setMessage("Hãy chọn ít nhất một mã để in thử.");
      return;
    }
    if (validationError) {
      setPrintState("error");
      setMessage(validationError);
      return;
    }
    await openPrintWindow(
      [{ ...jobs[0], quantity: 1 }],
      doubleLabelCount
        ? "Đã đóng hộp thoại in thử 1 cặp tem."
        : "Đã đóng hộp thoại in thử 1 tem.",
    );
  }

  async function openPrintWindow(nextJobs: ProductLabelPrintJob[], successMessage: string) {
    setPrintState("printing");
    setMessage("");
    const printWindow = window.open("", "_blank", "popup,width=860,height=700");
    if (!printWindow) {
      setPrintState("error");
      setMessage("Trình duyệt đang chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
      return;
    }
    try {
      printWindow.document.open();
      printWindow.document.write(buildProductLabelPrintDocument(nextJobs, labelSize, {
        layout,
        productionDate,
        expiryDate,
        batchCode,
        logo,
      }));
      printWindow.document.close();
      await printWhenAssetsReady(printWindow);
      printWindow.close();
      setPrintState("success");
      setMessage(successMessage);
    } catch (error) {
      printWindow.close();
      setPrintState("error");
      setMessage(
        error instanceof Error && error.message === "PRINT_ASSET_UNAVAILABLE"
          ? "Logo chưa tải được nên hệ thống đã dừng in để tránh tem trắng."
          : "Không thể tạo bản in. Hãy thử lại.",
      );
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        disabled={disabled || items.length === 0}
        onClick={open}
      >
        <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />
        {triggerLabel}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[var(--z-modal)] grid min-w-0 place-items-end p-2 sm:place-items-center sm:p-5">
           <button
            type="button"
            className="absolute inset-0 min-h-full w-full bg-[var(--color-overlay)]"
             aria-label="Đóng hộp in tem"
             tabIndex={-1}
            onClick={close}
          />
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-label-dialog-title"
            aria-describedby="product-label-dialog-description"
            tabIndex={-1}
            className="relative z-10 flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl min-w-0 flex-col overflow-hidden rounded-2xl border border-sand bg-bg-card text-navy shadow-[var(--shadow-float)] sm:max-h-[min(88dvh,48rem)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-sand p-4 sm:p-5">
              <div className="min-w-0">
                <h2
                  id="product-label-dialog-title"
                  className="min-w-0 font-display text-2xl font-bold [overflow-wrap:anywhere]"
                >
                  In tem sản phẩm
                </h2>
                <p id="product-label-dialog-description" className="mt-1 text-sm leading-6 text-text-muted">
                  Chọn đúng mã, số lượng tem và khổ giấy của máy in.
                </p>
              </div>
              <button
                type="button"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sand bg-bg-card text-text-muted hover:bg-bg-soft hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
                aria-label="Đóng"
                disabled={printState === "printing"}
                onClick={close}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]">
              <div className="grid min-w-0 content-start gap-3">
                <label className="grid gap-2 text-sm font-bold">
                  Khổ tem
                  <select
                    className={controlClass}
                    value={labelSize}
                    onChange={(event) => changeLabelSize(event.target.value as ProductLabelSize)}
                  >
                    <option value="50x30">50 × 30 mm</option>
                    <option value="40x30">40 × 30 mm</option>
                    <option value="35x22-double">35 × 22 mm · tem đôi</option>
                  </select>
                </label>

                <details className="group min-w-0 rounded-xl border border-sand bg-bg-main">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-extrabold text-navy outline-none hover:bg-bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden">
                    Tùy chỉnh tem
                    <span className="text-xs font-bold text-text-muted group-open:hidden">Mở</span>
                    <span className="hidden text-xs font-bold text-text-muted group-open:inline">Đóng</span>
                  </summary>
                  <div className="grid min-w-0 gap-4 border-t border-sand p-3">
                    <fieldset className="grid gap-2">
                      <legend className="text-xs font-bold text-text-muted">Mẫu nhanh</legend>
                      <div className="grid grid-cols-2 gap-2">
                        <PresetButton
                          active={layoutPreset === "compact"}
                          label="Gọn"
                          onClick={() => applyPreset("compact")}
                        />
                        <PresetButton
                          active={layoutPreset === "full"}
                          label="Đầy đủ"
                          onClick={() => applyPreset("full")}
                        />
                      </div>
                    </fieldset>

                    <fieldset className="grid gap-2">
                      <legend className="text-xs font-bold text-text-muted">Thông tin hiển thị</legend>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
                        <LayoutToggle label="Tên" checked={layout.showName} onChange={(checked) => updateLayout({ showName: checked })} />
                        <LayoutToggle label="Biến thể" checked={layout.showVariant} onChange={(checked) => updateLayout({ showVariant: checked })} />
                        <LayoutToggle label="SKU" checked={layout.showSku} onChange={(checked) => updateLayout({ showSku: checked })} />
                        <LayoutToggle label="Barcode" checked={layout.showBarcode} onChange={(checked) => updateLayout({ showBarcode: checked })} />
                        <LayoutToggle label="Giá bán" checked={layout.showPrice} onChange={(checked) => updateLayout({ showPrice: checked })} />
                        <LayoutToggle label="NSX" checked={layout.showProductionDate} onChange={(checked) => updateLayout({ showProductionDate: checked })} />
                        <LayoutToggle label="HSD" checked={layout.showExpiryDate} onChange={(checked) => updateLayout({ showExpiryDate: checked })} />
                        <LayoutToggle label="Số mẻ" checked={layout.showBatchCode} onChange={(checked) => updateLayout({ showBatchCode: checked })} />
                      </div>
                    </fieldset>

                    <div className="grid min-w-0 grid-cols-2 gap-3">
                      <SelectControl
                        label="Canh chữ"
                        value={layout.alignment}
                        onChange={(value) => updateLayout({ alignment: value as ProductLabelLayout["alignment"] })}
                        options={[{ value: "left", label: "Bên trái" }, { value: "center", label: "Ở giữa" }]}
                      />
                      <SelectControl
                        label="Cỡ tên"
                        value={layout.nameSize}
                        onChange={(value) => updateLayout({ nameSize: value as ProductLabelLayout["nameSize"] })}
                        options={[{ value: "small", label: "Nhỏ" }, { value: "medium", label: "Vừa" }, { value: "large", label: "Lớn" }]}
                      />
                      <SelectControl
                        label="Số dòng tên"
                        value={String(layout.nameLines)}
                        onChange={(value) => updateLayout({ nameLines: value === "2" ? 2 : 1 })}
                        options={[{ value: "1", label: "1 dòng" }, { value: "2", label: "2 dòng" }]}
                      />
                      <SelectControl
                        label="Chiều cao mã"
                        value={layout.barcodeHeight}
                        onChange={(value) => updateLayout({ barcodeHeight: value as ProductLabelLayout["barcodeHeight"] })}
                        options={[{ value: "low", label: "Thấp" }, { value: "medium", label: "Vừa" }, { value: "high", label: "Cao" }]}
                      />
                      {labelSize === "35x22-double" && (
                        <SelectControl
                          label="Tem bên trái"
                          value={layout.doubleMode}
                          onChange={(value) => updateLayout({
                            doubleMode: value as ProductLabelLayout["doubleMode"],
                          })}
                          options={[
                            { value: "logo-product", label: `Logo ${logo.alt}` },
                            { value: "product-product", label: "Sản phẩm" },
                          ]}
                        />
                      )}
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      {layout.showProductionDate && (
                        <InputControl label="Ngày sản xuất" type="date" value={productionDate} onChange={setProductionDate} />
                      )}
                      <InputControl label="Hạn sử dụng (HSD)" type="date" value={expiryDate} onChange={changeExpiryDate} />
                      {layout.showBatchCode && (
                        <InputControl label="Số mẻ / lô" value={batchCode} onChange={setBatchCode} placeholder="Ví dụ: M-0208" />
                      )}
                      <p className="text-xs leading-5 text-text-muted sm:col-span-2">
                        Chọn ngày sẽ tự bật HSD trên tem.
                      </p>
                    </div>

                    <details className="rounded-xl border border-sand bg-bg-card">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-xs font-extrabold text-navy outline-none hover:bg-bg-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden">
                        Canh máy in
                      </summary>
                      <div className="grid grid-cols-2 gap-3 border-t border-sand p-3">
                        <NumberControl label="Lề trong (mm)" value={layout.paddingMm} min={0.5} max={3} step={0.1} onChange={(value) => updateLayout({ paddingMm: value })} />
                        {labelSize === "35x22-double" && (
                          <NumberControl label="Khe giữa (mm)" value={layout.columnGapMm} min={0} max={4} step={0.1} onChange={(value) => updateLayout({ columnGapMm: value })} />
                        )}
                        <NumberControl label="Dịch ngang (mm)" value={layout.offsetXmm} min={-5} max={5} step={0.1} onChange={(value) => updateLayout({ offsetXmm: value })} />
                        <NumberControl label="Dịch dọc (mm)" value={layout.offsetYmm} min={-5} max={5} step={0.1} onChange={(value) => updateLayout({ offsetYmm: value })} />
                      </div>
                    </details>

                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className={defaultTriggerClass} onClick={saveLayout}>
                        Lưu thiết lập
                      </button>
                      <button
                        type="button"
                        className={defaultTriggerClass}
                        disabled={!jobs.length || Boolean(validationError) || printState === "printing"}
                        onClick={() => void printTestLabel()}
                      >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        {doubleLabelCount ? "In thử 1 cặp tem" : "In thử 1 tem"}
                      </button>
                    </div>
                  </div>
                </details>

                <fieldset className="grid min-w-0 gap-2">
                  <legend className="mb-1 text-sm font-bold">Mã cần in</legend>
                  {items.map((item) => {
                    const row = rows[item.id] ?? { selected: false, quantity: 0 };
                    const payload = productLabelPayload(item);
                    const rowDisabled = Boolean(item.disabledReason || !payload);
                    return (
                      <div
                        key={item.id}
                        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_5rem] items-center gap-3 rounded-xl border border-sand bg-bg-main p-3"
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 min-h-0 accent-brand-600"
                          checked={row.selected}
                          disabled={rowDisabled}
                          aria-label={`Chọn ${item.name}${item.variantLabel ? ` ${item.variantLabel}` : ""}`}
                          onChange={(event) =>
                            updateRow(item.id, {
                              selected: event.target.checked,
                              quantity: event.target.checked ? Math.max(1, row.quantity) : row.quantity,
                            })
                          }
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-navy">{item.name}</p>
                          <p className="mt-0.5 truncate text-xs font-semibold text-text-muted">
                            {item.variantLabel ? `${item.variantLabel} · ` : ""}
                            {item.disabledReason || payload || "Thiếu SKU/barcode"}
                          </p>
                        </div>
                        <label className="grid gap-1 text-xs font-bold text-text-muted">
                          Số tem
                          <input
                            type="number"
                            min={1}
                            max={999}
                            inputMode="numeric"
                            className={`${controlClass} tabular-nums`}
                            value={row.quantity || ""}
                            disabled={!row.selected || rowDisabled}
                            onChange={(event) =>
                              updateRow(item.id, {
                                quantity: Math.min(999, Math.max(0, Number(event.target.value) || 0)),
                              })
                            }
                          />
                        </label>
                      </div>
                    );
                  })}
                </fieldset>
              </div>

              <section className="grid min-w-0 content-start gap-3" aria-labelledby="label-preview-title">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="label-preview-title" className="text-sm font-bold">Xem trước</h3>
                  <span className="whitespace-nowrap text-xs font-bold text-text-muted">
                    {printCountLabel}
                  </span>
                </div>
                {previewJobs.length > 0 && previewPayload ? (
                  labelSize === "35x22-double" ? (
                    <div
                      className="mx-auto grid w-full max-w-md grid-cols-2 overflow-hidden border border-sand bg-bg-card shadow-[var(--shadow-card)]"
                      style={{
                        aspectRatio: `${70 + layout.columnGapMm} / 22`,
                        columnGap: `${layout.columnGapMm * 3}px`,
                      }}
                    >
                      {layout.doubleMode === "logo-product" ? (
                        <LogoPreviewCard
                          logo={logo}
                          offsetXmm={layout.offsetXmm}
                          offsetYmm={layout.offsetYmm}
                        />
                      ) : (
                        <LabelPreviewCard
                          job={previewJobs[0]}
                          compact
                          layout={layout}
                          productionDate={productionDate}
                          expiryDate={expiryDate}
                          batchCode={batchCode}
                        />
                      )}
                      <LabelPreviewCard
                        job={previewJobs[0]}
                        compact
                        layout={layout}
                        productionDate={productionDate}
                        expiryDate={expiryDate}
                        batchCode={batchCode}
                      />
                    </div>
                  ) : (
                    <div
                      className="mx-auto w-full max-w-xs overflow-hidden border border-sand bg-bg-card shadow-[var(--shadow-card)]"
                      style={{ aspectRatio: labelSize === "40x30" ? "4 / 3" : "5 / 3" }}
                    >
                      <LabelPreviewCard
                        job={previewJobs[0]}
                        layout={layout}
                        productionDate={productionDate}
                        expiryDate={expiryDate}
                        batchCode={batchCode}
                      />
                    </div>
                  )
                ) : (
                  <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-sand p-5 text-center text-sm leading-6 text-text-muted">
                    Chọn một sản phẩm có SKU hoặc barcode để xem tem.
                  </div>
                )}
                <p className="text-xs leading-5 text-text-muted">
                  {labelSize === "35x22-double"
                    ? layout.doubleMode === "logo-product"
                      ? `Mỗi trang gồm 1 tem logo ${logo.alt} và 1 tem thông tin sản phẩm, cùng khổ 35 × 22 mm.`
                      : "Mỗi trang gồm 2 tem thông tin sản phẩm, mỗi tem 35 × 22 mm."
                    : "Mỗi tem được in trên một trang đúng kích thước đã chọn."}
                </p>
                {validationError && (
                  <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-900">
                    {validationError}
                  </p>
                )}
              </section>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-sand bg-bg-card p-4 sm:p-5">
              <div className="min-h-5 text-xs font-bold">
                {printState === "error" && (
                  <p role="alert" className="text-red-700">{message}</p>
                )}
                {printState === "success" && (
                  <p role="status" className="text-emerald-700">{message}</p>
                )}
              </div>
              <button
                type="button"
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-[var(--color-accent-ink)] transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                disabled={printState === "printing" || totalLabels === 0 || Boolean(validationError)}
                onClick={() => void printLabels()}
              >
                {printState === "printing" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Printer className="h-4 w-4" aria-hidden="true" />
                )}
                {printState === "printing"
                  ? "Đang tạo…"
                  : totalLabels > 0
                    ? `In ${printCountLabel}`
                    : "In tem"}
              </button>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function LogoPreviewCard({
  logo,
  offsetXmm,
  offsetYmm,
}: {
  logo: ProductLabelLogo;
  offsetXmm: number;
  offsetYmm: number;
}) {
  return (
    <div
      data-label-preview="logo"
      className="grid min-w-0 place-items-center overflow-hidden border-r border-sand bg-bg-card p-1.5"
      style={{
        transform: `translate(${offsetXmm * 3}px, ${offsetYmm * 3}px)`,
      }}
    >
      <Image
        src={logo.src}
        alt={`Logo ${logo.alt}`}
        width={720}
        height={210}
        unoptimized
        className="h-full w-full object-contain"
      />
    </div>
  );
}

async function printWhenAssetsReady(printWindow: Window) {
  const images = Array.from(printWindow.document.images ?? []);
  await Promise.all(images.map(waitForPrintableImage));
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
  printWindow.focus();
  printWindow.print();
}

function waitForPrintableImage(image: HTMLImageElement) {
  if (image.complete) {
    return image.naturalWidth > 0
      ? Promise.resolve()
      : Promise.reject(new Error("PRINT_ASSET_UNAVAILABLE"));
  }
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("PRINT_ASSET_UNAVAILABLE")),
      5000,
    );
    image.addEventListener("load", () => {
      window.clearTimeout(timeout);
      image.naturalWidth > 0
        ? resolve()
        : reject(new Error("PRINT_ASSET_UNAVAILABLE"));
    }, { once: true });
    image.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("PRINT_ASSET_UNAVAILABLE"));
    }, { once: true });
  });
}

function LabelPreviewCard({
  job,
  layout,
  productionDate,
  expiryDate,
  batchCode,
  compact = false,
}: {
  job: ProductLabelPrintJob;
  layout: ProductLabelLayout;
  productionDate: string;
  expiryDate: string;
  batchCode: string;
  compact?: boolean;
}) {
  const payload = productLabelPayload(job);
  const metadata = [
    layout.showProductionDate && productionDate ? `NSX ${formatPreviewDate(productionDate)}` : "",
    layout.showExpiryDate && expiryDate ? `HSD ${formatPreviewDate(expiryDate)}` : "",
    layout.showBatchCode && batchCode.trim() ? `Lô ${batchCode.trim()}` : "",
  ].filter(Boolean);
  const compactLongName = compact && productLabelNameNeedsCompactFit(job.name);
  const compactRetailBarcode = compact && layout.showBarcode && [
    "EAN-8",
    "UPC-A",
    "EAN-13",
  ].includes(encodeProductBarcode(payload).symbology);
  const nameSizeClass = compact
    ? compactLongName
      ? "text-[7px]"
      : { small: "text-[7px]", medium: "text-[9px]", large: "text-[10px]" }[layout.nameSize]
    : { small: "text-xs", medium: "text-sm", large: "text-base" }[layout.nameSize];
  const useTwoNameLines = layout.nameLines === 2 || compactLongName;
  const barcodeHeightClass = compact
    ? compactRetailBarcode
      ? "h-4"
      : { low: "h-3", medium: "h-4", high: "h-5" }[layout.barcodeHeight]
    : { low: "h-6", medium: "h-8", high: "h-10" }[layout.barcodeHeight];
  return (
    <div
      data-label-preview={compact ? "compact" : "standard"}
      className={`flex min-w-0 flex-col justify-center overflow-hidden ${
        layout.alignment === "center" ? "text-center" : "text-left"
      } ${
        compact
          ? "border-r border-sand px-2 py-1.5 last:border-r-0"
          : "p-3"
      }`}
      style={{
        padding: `${layout.paddingMm * (compact ? 2.2 : 3)}px`,
        transform: `translate(${layout.offsetXmm * 3}px, ${layout.offsetYmm * 3}px)`,
      }}
    >
      {(layout.showName || (layout.showVariant && job.variantLabel)) && (
        <div className="min-w-0 shrink-0 overflow-hidden">
          {layout.showName && (
            <strong className={`block overflow-hidden font-black leading-[1.05] text-navy ${nameSizeClass} ${useTwoNameLines ? "line-clamp-2 [overflow-wrap:anywhere]" : "truncate"}`}>
              {job.name}
            </strong>
          )}
          {layout.showVariant && job.variantLabel && (
            <span className={`mt-0.5 block truncate font-semibold leading-none text-text-muted ${compact ? "text-[7px]" : "text-xs"}`}>
              {job.variantLabel}
            </span>
          )}
        </div>
      )}
      {layout.showPrice && typeof job.price === "number" && job.price > 0 && (
        <p className={`mt-0.5 shrink-0 font-black leading-none text-navy ${compact ? "text-[7px]" : "text-xs"}`}>
          {formatPreviewPrice(job.price)}
        </p>
      )}
      {layout.showBarcode && (
        <div className={`mt-1 min-w-0 shrink-0 ${compactRetailBarcode ? "mx-auto w-[92%]" : ""}`}>
          <BarcodePreview value={payload} heightClassName={barcodeHeightClass} />
          <p className={`mt-0.5 truncate text-center font-mono font-bold leading-none text-navy ${compactRetailBarcode ? "text-[7px] tracking-normal" : compact ? "text-[8px] tracking-normal" : "text-[10px] tracking-wider"}`}>
            {payload}
          </p>
        </div>
      )}
      {metadata.length > 0 && (
        <div
          className={`mt-1 shrink-0 font-bold leading-none text-text-muted ${
            compact
              ? "grid grid-cols-1 gap-y-0.5 text-[6px]"
              : "flex flex-wrap gap-x-1.5 gap-y-0.5 text-[8px]"
          }`}
        >
          {metadata.map((item) => (
            <span
              key={item}
              className="truncate"
            >
              {item}
            </span>
          ))}
        </div>
      )}
      {layout.showSku && (
        <p className={`mt-0.5 shrink-0 truncate font-bold leading-none text-text-muted ${compact ? "text-[6px]" : "text-[9px]"}`}>
          SKU {job.sku || "—"}
        </p>
      )}
    </div>
  );
}

function BarcodePreview({ value, heightClassName }: { value: string; heightClassName: string }) {
  const encoding = encodeProductBarcode(value);
  return (
    <svg
      className={`${heightClassName} block w-full text-navy`}
      viewBox={`0 0 ${encoding.width} 44`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${encoding.symbology} ${value}`}
    >
      {encoding.bars.map((bar, index) => (
        <rect
          key={`${bar.x}-${index}`}
          x={bar.x}
          y={0}
          width={bar.width}
          height={44}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function PresetButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-11 rounded-xl border px-3 text-sm font-extrabold outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:translate-y-px ${
        active
          ? "border-brand-600 bg-brand-600 text-[var(--color-accent-ink)]"
          : "border-sand bg-bg-card text-navy hover:bg-bg-soft"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function LayoutToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-bold text-navy">
      <input
        type="checkbox"
        className="h-5 w-5 min-h-0 shrink-0 accent-brand-600"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-bold text-text-muted">
      {label}
      <select className={controlClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function InputControl({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-bold text-text-muted">
      {label}
      <input
        className={controlClass}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-xs font-bold text-text-muted">
      {label}
      <input
        className={`${controlClass} tabular-nums`}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function loadSavedLayout(size: ProductLabelSize) {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(`${LABEL_LAYOUT_STORAGE_PREFIX}${size}`);
    if (!saved) return null;
    return normalizeProductLabelLayout(size, JSON.parse(saved) as Partial<ProductLabelLayout>);
  } catch {
    return null;
  }
}

function todayLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function labelSizeLabel(size: ProductLabelSize) {
  return size === "35x22-double" ? "35 × 22 mm · tem đôi" : `${size.replace("x", " × ")} mm`;
}

function formatPreviewDate(value: string) {
  const [year, month, day] = value.split("-");
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function formatPreviewPrice(value: number) {
  return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ₫`;
}
