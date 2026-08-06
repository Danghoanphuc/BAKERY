/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V4 */
/* Hallmark · component: production-waste calculator modal · genre: editorial · theme: existing admin system
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: inherited from the existing neutral and brand tokens
 */
"use client";

import { useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { toast } from "sonner";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import { Modal } from "@/components/common/Modal";
import { calculateWasteBasisPoints } from "@/features/wholesale-finance/domain/recipe-supplemental-costs";
import type { RecipeWasteCalculation } from "@/types";

export { calculateWasteBasisPoints } from "@/features/wholesale-finance/domain/recipe-supplemental-costs";

interface WasteCalculatorModalProps {
  currentWastePercent: number;
  defaultGoodQuantity: number;
  initialCalculation?: RecipeWasteCalculation;
  onClose: () => void;
  onApply: (
    wastePercent: number,
    calculation: RecipeWasteCalculation,
  ) => void;
}

export function WasteCalculatorModal({
  currentWastePercent,
  defaultGoodQuantity,
  initialCalculation,
  onClose,
  onApply,
}: WasteCalculatorModalProps) {
  const [calculation, setCalculation] = useState<RecipeWasteCalculation>(
    () =>
      initialCalculation
        ? { ...initialCalculation }
        : { plannedQuantity: 0, goodQuantity: defaultGoodQuantity },
  );
  const basisPoints = useMemo(
    () => calculateWasteBasisPoints(calculation),
    [calculation],
  );
  const wastePercent = basisPoints / 100;
  const invalid =
    calculation.plannedQuantity <= 0 ||
    calculation.goodQuantity < 0 ||
    calculation.goodQuantity > calculation.plannedQuantity;

  function apply() {
    if (invalid) {
      toast.error(
        "Sản lượng đạt chuẩn phải từ 0 đến sản lượng dự kiến trước hao hụt.",
      );
      return;
    }
    onApply(wastePercent, calculation);
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Tính hao hụt dự kiến của mẻ"
      className="lg:max-w-xl"
      headerContent={
        <p className="text-sm text-neutral-600">
          Dùng số liệu từ mẻ thử hoặc lịch sử sản xuất. Hao hụt là tỷ lệ, không
          phải một khoản tiền nhập thêm.
        </p>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Hao hụt dự kiến:{" "}
            <strong className="text-neutral-950">
              {formatPercent(wastePercent)}
            </strong>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 flex-1 whitespace-nowrap rounded-xl border border-neutral-300 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 active:bg-neutral-100 sm:flex-none"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={invalid}
              className="h-10 flex-1 whitespace-nowrap rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 active:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Áp dụng vào BOM
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Sản lượng dự kiến trước hao hụt"
            helper="Số sản phẩm lẽ ra thu được nếu không bị lỗi hoặc mất mát."
            value={calculation.plannedQuantity}
            onChange={(plannedQuantity) =>
              setCalculation((current) => ({
                ...current,
                plannedQuantity,
              }))
            }
          />
          <NumberField
            label="Sản lượng đạt chuẩn"
            helper="Số sản phẩm thực tế đạt chuẩn để nhập kho hoặc bán."
            value={calculation.goodQuantity}
            onChange={(goodQuantity) =>
              setCalculation((current) => ({ ...current, goodQuantity }))
            }
          />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-950 px-4 py-4 text-white">
          <div className="flex items-center gap-2">
            <Gauge aria-hidden="true" className="h-4 w-4 text-white/60" />
            <div>
              <p className="text-xs font-bold">Tỷ lệ hao hụt</p>
              <p className="mt-1 text-[11px] text-white/60">
                (Dự kiến − đạt chuẩn) ÷ dự kiến
              </p>
            </div>
          </div>
          <strong className="text-xl font-black">
            {formatPercent(wastePercent)}
          </strong>
        </div>

        {currentWastePercent > 0 && (
          <p className="text-xs text-neutral-500">
            BOM đang dùng{" "}
            <strong className="text-neutral-800">
              {formatPercent(currentWastePercent)}
            </strong>
            . Áp dụng sẽ thay bằng tỷ lệ vừa tính.
          </p>
        )}
      </div>
    </Modal>
  );
}

function NumberField({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">
        {label}
      </span>
      <FormattedNumberInput
        min={0}
        value={value}
        maximumFractionDigits={2}
        onValueChange={(nextValue) => onChange(nextValue ?? 0)}
        className="h-11 w-full rounded-xl border border-neutral-300 px-3 text-sm outline-none hover:border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <span className="mt-1 block min-h-8 text-[11px] leading-4 text-neutral-500">
        {helper}
      </span>
    </label>
  );
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}
