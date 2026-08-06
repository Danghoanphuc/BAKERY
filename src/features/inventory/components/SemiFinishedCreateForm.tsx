/* Hallmark · genre: editorial · macrostructure: Workbench · design-system: design.md · designed-as-app */
/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  CircleDashed,
  Factory,
  Loader2,
  PackageCheck,
  Plus,
  Trash2,
  Wheat,
} from "lucide-react";
import { toast } from "sonner";
import { AdminImageUploader } from "@/components/admin/AdminImageUploader";
import { createProductSkuPattern } from "@/lib/product-identifiers";
import type {
  FinanceIngredient,
  InventoryBaseUnit,
  Product,
  RecipeDirectLaborCostLine,
  RecipePackagingCostLine,
  RecipeVersion,
  RecipeWasteCalculation,
} from "@/types";
import { calculateRecipeDraftStandardUnitCost } from "@/features/wholesale-finance/domain/standard-costing";
import { RecipeSupplementalCostEditor } from "@/app/wholesale/finance/costing/_components/RecipeSupplementalCostEditor";
import { CreateItemShell } from "./CreateItemShell";
import { Field, NumberInput, inputClass } from "./IngredientCreateForm";

type SemiFinishedFormData = {
  name: string;
  imageUrl: string;
  baseUnit: InventoryBaseUnit;
  manufacturingOutputQuantity: number;
  manufacturingLeadMinutes: number;
  packagingCostPerBatch: number;
  directLaborCostPerBatch: number;
  overheadCostPerBatch: number;
  wastePercent: number;
  shelfLife: string;
  storage: string;
};

type BomLine = {
  ingredientId: string;
  quantity: number;
};

const initialData: SemiFinishedFormData = {
  name: "",
  imageUrl: "",
  baseUnit: "gram",
  manufacturingOutputQuantity: 1000,
  manufacturingLeadMinutes: 0,
  packagingCostPerBatch: 0,
  directLaborCostPerBatch: 0,
  overheadCostPerBatch: 0,
  wastePercent: 0,
  shelfLife: "",
  storage: "",
};

export function SemiFinishedCreateForm({
  apiPath,
  inventoryPath,
}: {
  apiPath: string;
  inventoryPath: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [ingredients, setIngredients] = useState<FinanceIngredient[]>([]);
  const [bomLines, setBomLines] = useState<BomLine[]>([
    { ingredientId: "", quantity: 0 },
  ]);
  const [packagingCostLines, setPackagingCostLines] = useState<RecipePackagingCostLine[]>([]);
  const [directLaborCostLines, setDirectLaborCostLines] = useState<RecipeDirectLaborCostLine[]>([]);
  const [wasteCalculation, setWasteCalculation] = useState<RecipeWasteCalculation>();
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recoveryProductId, setRecoveryProductId] = useState<string | null>(
    null,
  );
  const skuPreview = useMemo(
    () =>
      createProductSkuPattern({ itemType: "semi_finished", name: data.name }),
    [data.name],
  );
  const isWholesale = apiPath.startsWith("/api/wholesale");
  const financePath = isWholesale
    ? "/api/wholesale/finance"
    : "/api/admin/finance";
  const outputUnit = baseUnitLabel(data.baseUnit);
  const validBomLines = bomLines.filter(
    (line) => line.ingredientId && line.quantity > 0,
  );
  const estimatedCost = useMemo(() => {
    try {
      return calculateRecipeDraftStandardUnitCost({
        yieldQuantity: data.manufacturingOutputQuantity,
        ingredients: validBomLines,
        packagingCostPerBatch: data.packagingCostPerBatch,
        directLaborCostPerBatch: data.directLaborCostPerBatch,
        overheadCostPerBatch: data.overheadCostPerBatch,
        wasteBasisPoints: Math.round(data.wastePercent * 100),
      }, ingredients);
    } catch {
      return null;
    }
  }, [data, ingredients, validBomLines]);
  const estimatedUnitCost = estimatedCost?.totalCost ?? 0;

  useEffect(() => {
    let cancelled = false;
    async function loadIngredients() {
      setIsLoadingIngredients(true);
      try {
        const response = await fetch(`${financePath}/ingredients`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Không thể tải danh sách nguyên liệu.");
        }
        const payload = (await response.json()) as FinanceIngredient[];
        if (!cancelled) {
          setIngredients(payload.filter((ingredient) => ingredient.isActive));
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải danh sách nguyên liệu.";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoadingIngredients(false);
      }
    }
    void loadIngredients();
    return () => {
      cancelled = true;
    };
  }, [financePath]);

  const update = <K extends keyof SemiFinishedFormData>(
    key: K,
    value: SemiFinishedFormData[K],
  ) => setData((current) => ({ ...current, [key]: value }));

  const updateBomLine = (index: number, patch: Partial<BomLine>) => {
    setBomLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!data.name.trim()) {
      setError("Vui lòng nhập tên bán thành phẩm.");
      return;
    }
    if (
      !Number.isSafeInteger(data.manufacturingOutputQuantity) ||
      data.manufacturingOutputQuantity <= 0
    ) {
      setError("Sản lượng mỗi mẻ phải là một số nguyên lớn hơn 0.");
      return;
    }
    if (
      !validBomLines.length ||
      validBomLines.length !== bomLines.length ||
      validBomLines.some(
        (line) => !Number.isSafeInteger(line.quantity) || line.quantity <= 0,
      ) ||
      new Set(validBomLines.map((line) => line.ingredientId)).size !==
        validBomLines.length
    ) {
      setError(
        "BOM cần ít nhất một nguyên liệu; mỗi nguyên liệu chỉ xuất hiện một lần và có định lượng nguyên dương.",
      );
      return;
    }
    if (
      [
        data.packagingCostPerBatch,
        data.directLaborCostPerBatch,
        data.overheadCostPerBatch,
      ].some((value) => !Number.isSafeInteger(value) || value < 0) ||
      data.wastePercent < 0 ||
      data.wastePercent > 100
    ) {
      setError(
        "Chi phí theo mẻ phải là số nguyên không âm và hao hụt nằm trong khoảng 0–100%.",
      );
      return;
    }

    setIsSaving(true);
    let createdProduct: Product | null = null;
    try {
      const productResponse = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          imageUrl: data.imageUrl,
          itemType: "semi_finished",
          lifecycleStatus: "draft",
          baseUnit: data.baseUnit,
          manufacturingOutputQuantity: data.manufacturingOutputQuantity,
          manufacturingOutputUnit: outputUnit,
          manufacturingLeadMinutes: data.manufacturingLeadMinutes,
          stock: 0,
          ingredientsCost: 0,
          packagingCost: 0,
          laborCost: 0,
          overheadCost: 0,
          wastePercent: 0,
          shelfLife: data.shelfLife,
          storage: data.storage,
          productionSteps: [],
          ...(isWholesale ? {
            bom: {
              yieldQuantity: data.manufacturingOutputQuantity,
              ingredients: validBomLines,
              packagingCostPerBatch: data.packagingCostPerBatch,
              directLaborCostPerBatch: data.directLaborCostPerBatch,
              overheadCostPerBatch: data.overheadCostPerBatch,
              wasteBasisPoints: Math.round(data.wastePercent * 100),
              ...(packagingCostLines.length > 0 ? { packagingCostLines } : {}),
              ...(directLaborCostLines.length > 0 ? { directLaborCostLines } : {}),
              ...(wasteCalculation ? { wasteCalculation } : {}),
            },
          } : {}),
        }),
      });
      const productPayload = (await productResponse
        .json()
        .catch(() => null)) as
        | Product
        | { error?: string }
        | null;
      if (!productResponse.ok) {
        throw new Error(
          (productPayload as { error?: string } | null)?.error ||
            "Không thể tạo hồ sơ bán thành phẩm.",
        );
      }
      createdProduct = productPayload as Product;

      if (isWholesale) {
        router.push(`${inventoryPath}/${createdProduct.id}`);
        router.refresh();
        return;
      }

      const recipeResponse = await fetch(`${financePath}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: createdProduct.id,
          effectiveFrom: new Date(),
          yieldQuantity: data.manufacturingOutputQuantity,
          ingredients: validBomLines,
          packagingCostPerBatch: data.packagingCostPerBatch,
          directLaborCostPerBatch: data.directLaborCostPerBatch,
          overheadCostPerBatch: data.overheadCostPerBatch,
          wasteBasisPoints: Math.round(data.wastePercent * 100),
          ...(packagingCostLines.length > 0 ? { packagingCostLines } : {}),
          ...(directLaborCostLines.length > 0 ? { directLaborCostLines } : {}),
          ...(wasteCalculation ? { wasteCalculation } : {}),
        }),
      });
      const recipePayload = (await recipeResponse
        .json()
        .catch(() => null)) as RecipeVersion | { error?: string } | null;
      if (!recipeResponse.ok || !recipePayload || !("id" in recipePayload)) {
        throw new Error(
          (recipePayload as { error?: string } | null)?.error ||
            "Đã tạo hồ sơ nháp nhưng chưa thể lưu BOM.",
        );
      }

      const activationResponse = await fetch(
        `${financePath}/recipes/${recipePayload.id}/activate`,
        { method: "POST" },
      );
      const activationPayload = (await activationResponse
        .json()
        .catch(() => null)) as { error?: string } | null;
      if (!activationResponse.ok) {
        throw new Error(
          activationPayload?.error ||
            "BOM đã được lưu ở trạng thái nháp nhưng chưa thể kích hoạt.",
        );
      }

      router.push(`${inventoryPath}/${createdProduct.id}`);
      router.refresh();
    } catch (submitError) {
      let message =
        submitError instanceof Error
          ? submitError.message
          : "Không thể tạo bán thành phẩm.";
      if (createdProduct) {
        setRecoveryProductId(createdProduct.id);
        message = `${message} Hồ sơ “${createdProduct.name}” vẫn được giữ ở trạng thái nháp để tiếp tục hoàn thiện.`;
      }
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CreateItemShell
      backHref={inventoryPath}
      eyebrow="Mã kho · Bán thành phẩm"
      title="Tạo bán thành phẩm"
      description="Khai báo đầu ra và BOM trong một luồng. Hồ sơ chỉ chuyển sang hoạt động sau khi BOM được lưu và kích hoạt thành công."
    >
      <form
        onSubmit={submit}
        className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
      >
        <div className="min-w-0 space-y-5">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
            >
              <p>{error}</p>
              {recoveryProductId && (
                <Link
                  href={`${inventoryPath}/${recoveryProductId}`}
                  className="mt-2 inline-flex h-10 items-center whitespace-nowrap rounded-lg border border-red-200 bg-white px-3 text-xs font-bold text-red-800 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Mở hồ sơ nháp
                </Link>
              )}
            </div>
          )}

          <FormSection
            title="Hồ sơ bán thành phẩm"
            description="Ảnh đại diện và mã kho nội bộ; bán thành phẩm không được xuất bản ra cửa hàng."
          >
            <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_10rem] md:items-start">
              <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1.4fr)_minmax(12rem,0.6fr)]">
                <Field label="Tên bán thành phẩm" required>
                  <input
                    autoFocus
                    value={data.name}
                    onChange={(event) => update("name", event.target.value)}
                    className={inputClass}
                    placeholder="Ví dụ: Cốt bánh chocolate"
                    aria-required="true"
                  />
                </Field>
                <Field label="Mã bán thành phẩm">
                  <input
                    readOnly
                    value={skuPreview}
                    className={`${inputClass} bg-neutral-50 font-mono text-neutral-600`}
                    aria-describedby="semi-finished-sku-note"
                  />
                  <p
                    id="semi-finished-sku-note"
                    className="mt-1.5 min-h-5 text-xs leading-5 text-neutral-500"
                  >
                    Mã chính thức được cấp khi lưu.
                  </p>
                </Field>
              </div>
              <div className="w-full max-w-40">
                <AdminImageUploader
                  value={data.imageUrl}
                  onChange={(imageUrl) => update("imageUrl", imageUrl)}
                  label="Ảnh bán thành phẩm"
                />
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Đầu ra sản xuất"
            description="Diễn đạt một mẻ tạo ra bao nhiêu bán thành phẩm và tồn kho được theo dõi bằng đơn vị nào."
          >
            <div className="grid min-w-0 gap-5 sm:grid-cols-2">
              <Field label="Theo dõi tồn kho bằng" required>
                <select
                  value={data.baseUnit}
                  onChange={(event) =>
                    update("baseUnit", event.target.value as InventoryBaseUnit)
                  }
                  className={inputClass}
                  aria-required="true"
                >
                  <option value="gram">Gram (g)</option>
                  <option value="millilitre">Millilitre (ml)</option>
                  <option value="each">Cái / chiếc</option>
                </select>
              </Field>
              <Field label="Mỗi mẻ tạo ra" required>
                <NumberInput
                  value={data.manufacturingOutputQuantity}
                  onChange={(value) =>
                    update("manufacturingOutputQuantity", value)
                  }
                  min={1}
                  suffix={outputUnit}
                />
              </Field>
              <Field label="Thời gian dự kiến mỗi mẻ">
                <NumberInput
                  value={data.manufacturingLeadMinutes}
                  onChange={(value) =>
                    update("manufacturingLeadMinutes", value)
                  }
                  suffix="phút"
                />
              </Field>
              <Field label="Hạn sử dụng">
                <input
                  value={data.shelfLife}
                  onChange={(event) => update("shelfLife", event.target.value)}
                  className={inputClass}
                  placeholder="Ví dụ: 48 giờ"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Điều kiện bảo quản">
                  <input
                    value={data.storage}
                    onChange={(event) => update("storage", event.target.value)}
                    className={inputClass}
                    placeholder="Ví dụ: Bảo quản lạnh 2–5°C"
                  />
                </Field>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="BOM áp dụng"
            description="Chọn nguyên liệu và định lượng cho một mẻ. BOM này sẽ được kích hoạt ngay khi hồ sơ được tạo thành công."
          >
            {isLoadingIngredients ? (
              <div className="flex min-h-32 items-center justify-center text-sm font-semibold text-neutral-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tải nguyên liệu…
              </div>
            ) : ingredients.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold text-amber-950">
                  Chưa có nguyên liệu đang hoạt động
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  Cần tạo và kích hoạt ít nhất một nguyên liệu trước khi lập
                  bán thành phẩm.
                </p>
                <Link
                  href={`${inventoryPath}/new/ingredient`}
                  className="mt-3 inline-flex h-10 items-center whitespace-nowrap rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
                >
                  Tạo nguyên liệu
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bomLines.map((line, index) => {
                  const selectedIngredient = ingredients.find(
                    (ingredient) => ingredient.id === line.ingredientId,
                  );
                  const usedByOtherLines = new Set(
                    bomLines
                      .filter((_, lineIndex) => lineIndex !== index)
                      .map((item) => item.ingredientId)
                      .filter(Boolean),
                  );
                  return (
                    <div
                      key={index}
                      className="grid min-w-0 gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.36fr)_3rem]"
                    >
                      <Field label={`Nguyên liệu ${index + 1}`} required>
                        <select
                          value={line.ingredientId}
                          onChange={(event) =>
                            updateBomLine(index, {
                              ingredientId: event.target.value,
                            })
                          }
                          className={inputClass}
                          aria-required="true"
                        >
                          <option value="">Chọn nguyên liệu</option>
                          {ingredients.map((ingredient) => (
                            <option
                              key={ingredient.id}
                              value={ingredient.id}
                              disabled={usedByOtherLines.has(ingredient.id)}
                            >
                              {ingredient.name} · {ingredient.code}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Định lượng" required>
                        <NumberInput
                          value={line.quantity}
                          onChange={(quantity) =>
                            updateBomLine(index, { quantity })
                          }
                          min={1}
                          suffix={
                            selectedIngredient
                              ? baseUnitLabel(selectedIngredient.baseUnit)
                              : "đv"
                          }
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() =>
                          setBomLines((current) =>
                            current.length === 1
                              ? [{ ingredientId: "", quantity: 0 }]
                              : current.filter(
                                  (_, lineIndex) => lineIndex !== index,
                                ),
                          )
                        }
                        className="mt-7 grid h-12 w-12 place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 active:bg-red-100"
                        aria-label={`Xóa nguyên liệu ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setBomLines((current) => [
                      ...current,
                      { ingredientId: "", quantity: 0 },
                    ])
                  }
                  disabled={bomLines.length >= ingredients.length}
                  className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Plus className="h-4 w-4" />
                  Thêm nguyên liệu
                </button>
              </div>
            )}

            <div className="mt-6 border-t border-neutral-200 pt-5">
              <h3 className="text-sm font-extrabold text-neutral-900">
                Chi phí khác theo mẻ
              </h3>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Chi phí nguyên liệu được hệ thống tự tính từ định lượng BOM và
                giá mua hiện hành.
              </p>
              <div className="mt-4">
                <RecipeSupplementalCostEditor
                  values={data}
                  onChange={(patch) => setData((current) => ({ ...current, ...patch }))}
                  packagingCostLines={packagingCostLines}
                  onPackagingCostLinesChange={setPackagingCostLines}
                  directLaborCostLines={directLaborCostLines}
                  onDirectLaborCostLinesChange={setDirectLaborCostLines}
                  wasteCalculation={wasteCalculation}
                  onWasteCalculationChange={setWasteCalculation}
                  batchCycleMinutes={data.manufacturingLeadMinutes}
                  yieldQuantity={data.manufacturingOutputQuantity}
                  enableOverheadCalculator={isWholesale}
                />
              </div>
            </div>
          </FormSection>
        </div>

        <aside className="lg:sticky lg:top-5">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Factory className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-tight text-neutral-950">
                    Kiểm tra sản xuất
                  </h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    BOM v1 · kích hoạt khi tạo
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-neutral-100 px-5">
              <SummaryRow
                icon={<PackageCheck className="h-4 w-4" />}
                label="Mã dự kiến"
                value={skuPreview}
              />
              <SummaryRow
                icon={<Factory className="h-4 w-4" />}
                label="Đầu ra mỗi mẻ"
                value={`${formatNumber(data.manufacturingOutputQuantity)} ${outputUnit}`}
              />
              <SummaryRow
                icon={
                  validBomLines.length > 0 &&
                  validBomLines.length === bomLines.length ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <CircleDashed className="h-4 w-4" />
                  )
                }
                label="Nguyên liệu trong BOM"
                value={
                  validBomLines.length
                    ? `${validBomLines.length} nguyên liệu`
                    : "Chưa đủ nguyên liệu"
                }
                ready={
                  validBomLines.length > 0 &&
                  validBomLines.length === bomLines.length
                }
              />
              <SummaryRow
                icon={<Wheat className="h-4 w-4" />}
                label="Giá vốn dự kiến"
                value={
                  estimatedUnitCost > 0
                    ? `${formatCurrency(estimatedUnitCost)} / ${outputUnit}`
                    : "Chưa có dữ liệu chi phí"
                }
              />
            </div>
            <div className="space-y-2 border-t border-neutral-200 bg-neutral-50 p-4">
              <button
                type="submit"
                disabled={
                  isSaving ||
                  isLoadingIngredients ||
                  ingredients.length === 0 ||
                  Boolean(recoveryProductId)
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-4 text-sm font-extrabold text-bg-card transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 active:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSaving ? "Đang thiết lập…" : "Tạo và kích hoạt BOM"}
              </button>
              <Link
                href={inventoryPath}
                className="inline-flex h-11 w-full items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500 active:bg-neutral-200"
              >
                Hủy
              </Link>
            </div>
          </div>
        </aside>
      </form>
    </CreateItemShell>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white">
      <header className="border-b border-neutral-200 px-5 py-4 sm:px-6">
        <h2 className="font-display text-xl font-semibold tracking-tight text-neutral-950">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">
          {description}
        </p>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  ready = true,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  ready?: boolean;
}) {
  return (
    <div className="flex gap-3 py-4">
      <span className={ready ? "mt-0.5 text-brand-600" : "mt-0.5 text-neutral-400"}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold text-neutral-500">{label}</p>
        <p className="mt-1 break-words text-sm font-bold leading-5 text-neutral-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function baseUnitLabel(unit: InventoryBaseUnit) {
  if (unit === "millilitre") return "ml";
  if (unit === "each") return "cái";
  return "g";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 2,
  }).format(value);
}
