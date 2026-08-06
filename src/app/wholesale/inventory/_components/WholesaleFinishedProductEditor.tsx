/* Hallmark · pre-emit critique: P5 H4 E4 S5 R4 V4
 * genre: editorial commerce · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app
 */
"use client";

import {
  ArrowLeft,
  Check,
  CircleDashed,
  Loader2,
  PackageCheck,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import type {
  Category,
  DealerTier,
  DealerType,
  InventoryBalance,
  Product,
  WholesalePriceBreak,
} from "@/types";
import type { ProductCostSummary } from "@/features/wholesale-finance";
import {
  applyExistingProductToWholesaleForm,
  createEmptyWholesaleFinishedProductForm,
  getWholesaleFinishedProductFormError,
  wholesaleFinishedProductFormToPayload,
  type WholesaleFinishedProductFormData,
} from "../_lib/wholesale-finished-product-form";

type CostingSummaryResponse = {
  byProductId: Record<string, ProductCostSummary>;
};

const DEALER_TYPES: Array<{ value: DealerType; label: string }> = [
  { value: "retail", label: "Cửa hàng bán lẻ" },
  { value: "restaurant", label: "Nhà hàng" },
  { value: "cafe", label: "Quán cà phê" },
  { value: "other", label: "Đối tác khác" },
];

const DEALER_TIERS: Array<{ value: DealerTier; label: string }> = [
  { value: "regular", label: "Thường" },
  { value: "silver", label: "Bạc" },
  { value: "gold", label: "Vàng" },
  { value: "platinum", label: "Bạch kim" },
];

export function WholesaleFinishedProductEditor() {
  const router = useRouter();
  const [formData, setFormData] = useState(createEmptyWholesaleFinishedProductForm);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [costingByProductId, setCostingByProductId] = useState<
    Record<string, ProductCostSummary>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventoryBalances, setInventoryBalances] = useState<InventoryBalance[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [productsResponse, categoriesResponse, costingResponse] =
          await Promise.all([
            fetch("/api/wholesale/products", { cache: "no-store" }),
            fetch("/api/wholesale/categories", { cache: "no-store" }),
            fetch("/api/wholesale/finance/costing-summary", { cache: "no-store" }),
          ]);
        if (!productsResponse.ok || !categoriesResponse.ok) {
          throw new Error("Không thể tải danh mục thành phẩm bán sỉ.");
        }
        const [nextProducts, nextCategories] = await Promise.all([
          productsResponse.json() as Promise<Product[]>,
          categoriesResponse.json() as Promise<Category[]>,
        ]);
        const costing = costingResponse.ok
          ? await costingResponse.json() as CostingSummaryResponse
          : { byProductId: {} };
        if (cancelled) return;
        setProducts(nextProducts.filter((item) => item.itemType === "finished_good"));
        setCategories(nextCategories);
        setCostingByProductId(costing.byProductId ?? {});
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error
            ? loadError.message
            : "Không thể tải trang.");
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

  useEffect(() => {
    let cancelled = false;
    if (formData.source !== "existing" || !formData.productId) {
      return;
    }
    fetch(
      `/api/wholesale/finance/inventory/balances?itemType=product&itemId=${encodeURIComponent(formData.productId)}`,
      { cache: "no-store" },
    )
      .then(async (response) => response.ok
        ? await response.json() as InventoryBalance[]
        : [])
      .then((balances) => {
        if (!cancelled) setInventoryBalances(balances);
      })
      .catch(() => {
        if (!cancelled) setInventoryBalances([]);
      });
    return () => {
      cancelled = true;
    };
  }, [formData.productId, formData.source]);

  const selectedProduct = products.find((item) => item.id === formData.productId);
  const costingSummary = formData.source === "existing" && formData.productId
    ? costingByProductId[formData.productId]
    : undefined;
  const unitProductPrice = formData.unitsPerSellUnit > 0
    ? Math.round(formData.wholesalePrice / formData.unitsPerSellUnit)
    : 0;
  const minimumOrderValue =
    formData.wholesalePrice * formData.minimumOrderQuantity;
  const availableBaseQuantity = inventoryBalances
    .filter((item) => item.locationId === formData.locationId)
    .reduce((sum, item) => sum + item.quantity, 0);
  const availableSellUnits = formData.source === "existing"
    ? Math.floor(availableBaseQuantity / Math.max(1, formData.unitsPerSellUnit))
    : 0;
  const costPerSellUnit = costingSummary
    ? costingSummary.totalCost * formData.unitsPerSellUnit
    : 0;
  const grossMargin = formData.wholesalePrice > 0 && costPerSellUnit > 0
    ? Math.round(
      ((formData.wholesalePrice - costPerSellUnit) / formData.wholesalePrice) *
        10_000,
    ) / 100
    : null;
  const checks = useMemo(() => [
    {
      label: formData.source === "existing" ? "Thành phẩm nguồn" : "Tên nội bộ",
      ready: formData.source === "existing"
        ? Boolean(formData.productId)
        : Boolean(formData.name.trim()),
    },
    { label: "Quy cách bán", ready: Boolean(formData.sellUnitLabel.trim()) },
    { label: "Số lượng / quy cách", ready: formData.unitsPerSellUnit > 0 },
    { label: "MOQ & bước đặt", ready: formData.minimumOrderQuantity > 0 &&
      formData.orderIncrement > 0 &&
      formData.minimumOrderQuantity % formData.orderIncrement === 0 },
    { label: "Giá sỉ", ready: formData.wholesalePrice > 0 },
    { label: "Kho xuất", ready: Boolean(formData.locationId.trim()) },
  ], [formData]);
  const validationError = getWholesaleFinishedProductFormError(formData);

  function update<K extends keyof WholesaleFinishedProductFormData>(
    key: K,
    value: WholesaleFinishedProductFormData[K],
  ) {
    setFormData((current) => ({ ...current, [key]: value }));
  }

  function changeSource(source: "new" | "existing") {
    setError(null);
    setInventoryBalances([]);
    setFormData((current) => {
      const base = createEmptyWholesaleFinishedProductForm();
      return {
        ...base,
        wholesalePrice: current.wholesalePrice,
        minimumOrderQuantity: current.minimumOrderQuantity,
        orderIncrement: current.orderIncrement,
        sellUnitLabel: current.sellUnitLabel,
        unitsPerSellUnit: current.unitsPerSellUnit,
        source,
      };
    });
  }

  function selectExistingProduct(productId: string) {
    setInventoryBalances([]);
    setFormData((current) => applyExistingProductToWholesaleForm(
      { ...current, productId },
      products.find((item) => item.id === productId),
    ));
  }

  function setMembership<T extends string>(
    key: "eligibleDealerTypes" | "eligibleDealerTiers",
    value: T,
    checked: boolean,
  ) {
    setFormData((current) => {
      const values = current[key] as T[];
      return {
        ...current,
        [key]: checked
          ? [...new Set([...values, value])]
          : values.filter((item) => item !== value),
      };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/wholesale/catalog/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wholesaleFinishedProductFormToPayload(formData)),
      });
      const result = await response.json().catch(() => null) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(result?.error || "Không thể tạo thành phẩm bán sỉ.");
      }
      toast.success(
        formData.isAvailable
          ? "Đã tạo và mở bán thành phẩm sỉ."
          : "Đã lưu thành phẩm sỉ ở trạng thái nháp.",
      );
      router.push("/wholesale/inventory");
    } catch (saveError) {
      const message = saveError instanceof Error
        ? saveError.message
        : "Không thể tạo thành phẩm bán sỉ.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-neutral-600">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Đang tải hồ sơ bán sỉ…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6">
        <Link
          href="/wholesale/inventory"
          className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap text-sm font-bold text-neutral-600 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại kho
        </Link>
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="min-w-0 font-display text-2xl font-semibold tracking-tight text-neutral-950 [overflow-wrap:anywhere] sm:text-3xl">
              Tạo thành phẩm bán sỉ
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
              Khai báo hàng hóa, quy cách đóng gói, giá và điều kiện phân phối cho
              đại lý. Nội dung website bán lẻ không nằm trong hồ sơ này.
            </p>
          </div>
          <span className="w-fit rounded-md bg-neutral-100 px-2.5 py-1.5 text-xs font-bold text-neutral-600">
            Hồ sơ mới · {formData.isAvailable ? "Sẵn sàng mở bán" : "Bản nháp"}
          </span>
        </div>
      </header>

      <form
        onSubmit={submit}
        className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start"
      >
        <div className="min-w-0 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700"
            >
              {error}
            </div>
          )}

          <FormSection
            title="Thành phẩm nguồn"
            description="Liên kết một thành phẩm đã có hoặc tạo hồ sơ nội bộ mới trong kho bán sỉ."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <SourceChoice
                checked={formData.source === "new"}
                title="Tạo thành phẩm mới"
                detail="Dùng khi kho chưa có mã hàng này."
                onChange={() => changeSource("new")}
              />
              <SourceChoice
                checked={formData.source === "existing"}
                title="Dùng thành phẩm đã có"
                detail="Chỉ thêm một quy cách bán sỉ."
                onChange={() => changeSource("existing")}
              />
            </div>

            {formData.source === "existing" ? (
              <div className="mt-5">
                <SelectField
                  label="Chọn thành phẩm"
                  required
                  value={formData.productId}
                  onChange={selectExistingProduct}
                >
                  <option value="">Chọn mã hàng trong kho</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · {product.sku || "chưa có SKU"}
                    </option>
                  ))}
                </SelectField>
                {selectedProduct && (
                  <div className="mt-3 grid gap-2 border-t border-neutral-200 pt-3 text-sm sm:grid-cols-3">
                    <ReadOnlyValue label="Tên nội bộ" value={selectedProduct.name} />
                    <ReadOnlyValue label="SKU gốc" value={selectedProduct.sku || "—"} />
                    <ReadOnlyValue
                      label="Tồn danh mục"
                      value={`${selectedProduct.stock ?? 0} ${baseUnitLabel(formData.baseUnit)}`}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Tên thành phẩm nội bộ"
                  required
                  value={formData.name}
                  onChange={(value) => update("name", value)}
                  className="sm:col-span-2"
                  placeholder="Ví dụ: Bánh mì bơ tỏi 80g"
                />
                <SelectField
                  label="Nhóm hàng nội bộ"
                  value={formData.categoryId}
                  onChange={(value) => update("categoryId", value)}
                >
                  <option value="">Chưa phân nhóm</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </SelectField>
                <SelectField
                  label="Đơn vị tồn cơ sở"
                  value={formData.baseUnit}
                  onChange={(value) =>
                    update("baseUnit", value as WholesaleFinishedProductFormData["baseUnit"])}
                >
                  <option value="each">Cái / chiếc</option>
                  <option value="gram">Gram</option>
                  <option value="millilitre">Millilitre</option>
                </SelectField>
                <TextField
                  label="SKU gốc"
                  value={formData.sku}
                  onChange={(value) => update("sku", value.toUpperCase())}
                  placeholder="Để trống để tự cấp"
                />
                <TextField
                  label="Barcode gốc"
                  value={formData.barcode}
                  onChange={(value) => update("barcode", value)}
                  inputMode="numeric"
                  placeholder="Để trống để tự cấp"
                />
                <TextField
                  label="Ảnh nhận diện"
                  value={formData.imageUrl}
                  onChange={(value) => update("imageUrl", value)}
                  className="sm:col-span-2"
                  placeholder="URL ảnh, không bắt buộc"
                />
                <TextField
                  label="Hạn sử dụng"
                  value={formData.shelfLife}
                  onChange={(value) => update("shelfLife", value)}
                  placeholder="Ví dụ: 3 ngày từ NSX"
                />
                <TextAreaField
                  label="Điều kiện bảo quản"
                  value={formData.storage}
                  onChange={(value) => update("storage", value)}
                  placeholder="Nơi khô ráo, tránh ánh nắng…"
                />
              </div>
            )}
          </FormSection>

          <FormSection
            title="Quy cách bán sỉ"
            description="Số lượng đặt hàng được tính theo quy cách này, không phải theo biến thể website."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="Tên quy cách"
                required
                value={formData.sellUnitLabel}
                onChange={(value) => update("sellUnitLabel", value)}
                placeholder="Thùng 24, khay 6…"
              />
              <NumberField
                label={`Số ${baseUnitLabel(formData.baseUnit)} / quy cách`}
                required
                min={1}
                value={formData.unitsPerSellUnit}
                onChange={(value) => update("unitsPerSellUnit", value)}
              />
              <NumberField
                label="MOQ (quy cách)"
                required
                min={1}
                value={formData.minimumOrderQuantity}
                onChange={(value) => update("minimumOrderQuantity", value)}
              />
              <NumberField
                label="Bước đặt hàng"
                required
                min={1}
                value={formData.orderIncrement}
                onChange={(value) => update("orderIncrement", value)}
              />
              <TextField
                label="SKU quy cách"
                value={formData.sellUnitSku}
                onChange={(value) => update("sellUnitSku", value.toUpperCase())}
                placeholder="Ví dụ: BM-BT-24"
              />
              <TextField
                label="Barcode quy cách"
                value={formData.sellUnitBarcode}
                onChange={(value) => update("sellUnitBarcode", value)}
                inputMode="numeric"
              />
            </div>
          </FormSection>

          <FormSection
            title="Giá và chính sách đại lý"
            description="Giá được nhập trên một quy cách bán. Bậc giá số lượng được áp dụng trước chiết khấu hạng đại lý."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Giá sỉ / quy cách"
                min={0}
                value={formData.wholesalePrice}
                onChange={(value) => update("wholesalePrice", value)}
                suffix="₫"
              />
              <ReadOnlyValue
                label={`Giá quy đổi / ${baseUnitLabel(formData.baseUnit)}`}
                value={formatCurrency(unitProductPrice)}
                bordered
              />
            </div>

            <PriceBreakEditor
              value={formData.priceBreaks}
              minimumQuantity={formData.minimumOrderQuantity}
              orderIncrement={formData.orderIncrement}
              onChange={(value) => update("priceBreaks", value)}
            />

            <div className="mt-5 border-t border-neutral-200 pt-4">
              <p className="text-sm font-bold text-neutral-900">Chiết khấu theo hạng đại lý</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(["silver", "gold", "platinum"] as const).map((tier) => (
                  <NumberField
                    key={tier}
                    label={DEALER_TIERS.find((item) => item.value === tier)?.label ?? tier}
                    min={0}
                    max={100}
                    value={formData.tierDiscounts[tier]}
                    onChange={(value) => update("tierDiscounts", {
                      ...formData.tierDiscounts,
                      [tier]: value,
                    })}
                    suffix="%"
                  />
                ))}
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Phân phối và nguồn hàng"
            description="Kho xuất là nơi đối chiếu tồn. Để trống nhóm đại lý nghĩa là cho phép tất cả."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextField
                label="Mã kho xuất"
                required
                value={formData.locationId}
                onChange={(value) => update("locationId", value)}
                placeholder="main"
              />
              <NumberField
                label="Thời gian chuẩn bị"
                min={0}
                value={formData.leadTimeHours}
                onChange={(value) => update("leadTimeHours", value)}
                suffix="giờ"
              />
              <TextField
                label="Khu vực giao"
                value={formData.deliveryAreas}
                onChange={(value) => update("deliveryAreas", value)}
                placeholder="Quận 1, Quận 3"
              />
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <CheckboxGroup
                title="Loại đại lý"
                options={DEALER_TYPES}
                selected={formData.eligibleDealerTypes}
                onChange={(value, checked) =>
                  setMembership("eligibleDealerTypes", value, checked)}
              />
              <CheckboxGroup
                title="Hạng đại lý"
                options={DEALER_TIERS}
                selected={formData.eligibleDealerTiers}
                onChange={(value, checked) =>
                  setMembership("eligibleDealerTiers", value, checked)}
              />
            </div>

            <label className="mt-5 flex min-h-12 cursor-pointer items-center justify-between gap-4 border-t border-neutral-200 pt-4">
              <span>
                <span className="block text-sm font-bold text-neutral-900">
                  Mở bán ngay cho đội ngũ đi tuyến
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-neutral-500">
                  Tắt để lưu bản nháp và hoàn thiện giá hoặc BOM sau.
                </span>
              </span>
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(event) => update("isAvailable", event.target.checked)}
                className="h-5 w-5 shrink-0 rounded border-neutral-300 text-brand-600 focus:ring-brand-600"
              />
            </label>
          </FormSection>
        </div>

        <aside className="lg:sticky lg:top-5">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <PackageCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-neutral-950">
                    Kiểm tra mở bán
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Thành phẩm dành cho đại lý
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-neutral-200">
              <SummaryMetric
                label="Giá / quy cách"
                value={formatCurrency(formData.wholesalePrice)}
              />
              <SummaryMetric
                label="Đơn tối thiểu"
                value={formatCurrency(minimumOrderValue)}
              />
              <SummaryMetric
                label="Giá quy đổi"
                value={formatCurrency(unitProductPrice)}
              />
              <SummaryMetric
                label="Biên dự kiến"
                value={grossMargin === null ? "Chờ BOM" : `${grossMargin}%`}
              />
              <SummaryMetric
                label="Tồn khả dụng"
                value={`${availableSellUnits} ${formData.sellUnitLabel || "quy cách"}`}
              />
              <SummaryMetric
                label="Kho xuất"
                value={formData.locationId || "Chưa chọn"}
              />
            </div>

            <div className="divide-y divide-neutral-100 px-5">
              {checks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <span className="text-sm font-semibold text-neutral-700">
                    {check.label}
                  </span>
                  {check.ready ? (
                    <Check
                      className="h-4 w-4 shrink-0 text-emerald-600"
                      aria-label="Đã hoàn thiện"
                    />
                  ) : (
                    <CircleDashed
                      className="h-4 w-4 shrink-0 text-neutral-400"
                      aria-label="Chưa hoàn thiện"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 bg-neutral-50 px-5 py-4">
              <p className="text-xs font-bold text-neutral-500">Sau khi tạo</p>
              <p className="mt-1 text-sm font-bold leading-5 text-neutral-900">
                {formData.isAvailable
                  ? "Xuất hiện trong danh mục đặt hàng đi tuyến"
                  : "Lưu nội bộ, chưa cho phép đặt hàng"}
              </p>
            </div>

            <div className="space-y-2 border-t border-neutral-200 p-4">
              <button
                type="submit"
                disabled={isSaving || Boolean(validationError)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-[var(--color-accent-ink)] transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving
                  ? "Đang lưu…"
                  : formData.isAvailable
                    ? "Tạo và mở bán"
                    : "Lưu bản nháp"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/wholesale/inventory")}
                disabled={isSaving}
                className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 active:bg-neutral-200 disabled:opacity-55"
              >
                Hủy
              </button>
              {validationError && (
                <p className="pt-1 text-xs leading-5 text-neutral-500">
                  {validationError}
                </p>
              )}
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <div className="border-b border-neutral-200 pb-4">
        <h2 className="text-base font-black text-neutral-950">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-600">{description}</p>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function SourceChoice({
  checked,
  title,
  detail,
  onChange,
}: {
  checked: boolean;
  title: string;
  detail: string;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3 transition-colors hover:border-brand-300">
      <input
        type="radio"
        name="product-source"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 border-neutral-300 text-brand-600 focus:ring-brand-600"
      />
      <span>
        <span className="block text-sm font-bold text-neutral-900">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-neutral-500">{detail}</span>
      </span>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  className,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputMode?: "text" | "numeric";
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="min-h-24 w-full resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  required?: boolean;
  suffix?: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      <span className="relative block">
        <input
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 pr-12 text-sm tabular-nums text-neutral-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  required = false,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-700">
        {label}{required && <span className="text-red-600"> *</span>}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-950 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {children}
      </select>
    </label>
  );
}

function PriceBreakEditor({
  value,
  minimumQuantity,
  orderIncrement,
  onChange,
}: {
  value: WholesalePriceBreak[];
  minimumQuantity: number;
  orderIncrement: number;
  onChange: (value: WholesalePriceBreak[]) => void;
}) {
  function updateBreak(index: number, patch: Partial<WholesalePriceBreak>) {
    onChange(value.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item));
  }
  return (
    <div className="mt-5 border-t border-neutral-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-neutral-900">Bậc giá theo số lượng</p>
          <p className="mt-0.5 text-xs leading-5 text-neutral-500">
            Giá trên một quy cách khi đạt mốc đặt hàng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([
            ...value,
            {
              minQuantity: value.length > 0
                ? value[value.length - 1].minQuantity + Math.max(1, orderIncrement)
                : Math.max(1, minimumQuantity),
              unitPrice: 0,
            },
          ])}
          className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Thêm bậc giá
        </button>
      </div>
      {value.length > 0 ? (
        <div className="mt-3 space-y-2">
          {value.map((item, index) => (
            <div
              key={`${index}-${item.minQuantity}`}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] gap-2"
            >
              <NumberField
                label="Từ số lượng"
                min={1}
                value={item.minQuantity}
                onChange={(minQuantity) => updateBreak(index, { minQuantity })}
              />
              <NumberField
                label="Giá / quy cách"
                min={0}
                value={item.unitPrice}
                onChange={(unitPrice) => updateBreak(index, { unitPrice })}
                suffix="₫"
              />
              <button
                type="button"
                onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}
                className="mt-[29px] grid h-11 w-11 place-items-center rounded-xl text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                aria-label={`Xóa bậc giá ${index + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-neutral-500">
          Chưa dùng giá theo số lượng; mọi đơn áp dụng giá sỉ cơ sở.
        </p>
      )}
    </div>
  );
}

function CheckboxGroup<T extends string>({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: Array<{ value: T; label: string }>;
  selected: T[];
  onChange: (value: T, checked: boolean) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-neutral-900">{title}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) => onChange(option.value, event.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-600"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ReadOnlyValue({
  label,
  value,
  bordered = false,
}: {
  label: string;
  value: string;
  bordered?: boolean;
}) {
  return (
    <div className={bordered ? "rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2" : ""}>
      <p className="text-xs font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold tabular-nums text-neutral-900">{value}</p>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-white px-3 py-3">
      <p className="truncate text-[11px] font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black tabular-nums text-neutral-950">{value}</p>
    </div>
  );
}

function baseUnitLabel(unit: WholesaleFinishedProductFormData["baseUnit"]) {
  if (unit === "gram") return "g";
  if (unit === "millilitre") return "ml";
  return "cái";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}
