"use client";

import { useEffect, useState } from "react";
import { Gauge, PackageOpen, Settings2, UsersRound } from "lucide-react";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import {
  EMPTY_MANUFACTURING_OVERHEAD_SETTINGS,
} from "@/features/wholesale-finance/domain/manufacturing-overhead";
import type {
  ManufacturingOverheadSettings,
  RecipeDirectLaborCostLine,
  RecipePackagingCostLine,
  RecipeWasteCalculation,
} from "@/types";
import { DirectLaborCalculatorModal } from "./DirectLaborCalculatorModal";
import { OverheadSettingsModal } from "./OverheadSettingsModal";
import { PackagingCostCalculatorModal } from "./PackagingCostCalculatorModal";
import { WasteCalculatorModal } from "./WasteCalculatorModal";

export type SupplementalCostValues = {
  packagingCostPerBatch: number;
  directLaborCostPerBatch: number;
  overheadCostPerBatch: number;
  wastePercent: number;
};

type Props = {
  values: SupplementalCostValues;
  onChange: (patch: Partial<SupplementalCostValues>) => void;
  packagingCostLines: RecipePackagingCostLine[];
  onPackagingCostLinesChange: (lines: RecipePackagingCostLine[]) => void;
  directLaborCostLines: RecipeDirectLaborCostLine[];
  onDirectLaborCostLinesChange: (lines: RecipeDirectLaborCostLine[]) => void;
  wasteCalculation?: RecipeWasteCalculation;
  onWasteCalculationChange: (value?: RecipeWasteCalculation) => void;
  batchCycleMinutes: number;
  yieldQuantity: number;
  enableOverheadCalculator?: boolean;
};

type ModalName = "packaging" | "labor" | "overhead" | "waste" | null;

export function RecipeSupplementalCostEditor({
  values,
  onChange,
  packagingCostLines,
  onPackagingCostLinesChange,
  directLaborCostLines,
  onDirectLaborCostLinesChange,
  wasteCalculation,
  onWasteCalculationChange,
  batchCycleMinutes,
  yieldQuantity,
  enableOverheadCalculator = true,
}: Props) {
  const [modal, setModal] = useState<ModalName>(null);
  const [overheadSettings, setOverheadSettings] =
    useState<ManufacturingOverheadSettings>(EMPTY_MANUFACTURING_OVERHEAD_SETTINGS);
  const [overheadSettingsReady, setOverheadSettingsReady] =
    useState(!enableOverheadCalculator);

  useEffect(() => {
    if (!enableOverheadCalculator) return;
    let cancelled = false;
    fetch("/api/wholesale/finance/overhead-settings", { cache: "no-store" })
      .then(async (response) => response.ok
        ? await response.json() as ManufacturingOverheadSettings
        : EMPTY_MANUFACTURING_OVERHEAD_SETTINGS)
      .then((settings) => {
        if (!cancelled) setOverheadSettings(settings);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setOverheadSettingsReady(true);
      });
    return () => { cancelled = true; };
  }, [enableOverheadCalculator]);

  return (
    <>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CostField
          label="Bao bì / mẻ"
          value={values.packagingCostPerBatch}
          onChange={(value) => {
            onPackagingCostLinesChange([]);
            onChange({ packagingCostPerBatch: value });
          }}
          actionLabel="Tính chi tiết bao bì"
          icon={<PackageOpen />}
          onAction={() => setModal("packaging")}
        />
        <CostField
          label="Nhân công trực tiếp / mẻ"
          value={values.directLaborCostPerBatch}
          onChange={(value) => {
            onDirectLaborCostLinesChange([]);
            onChange({ directLaborCostPerBatch: value });
          }}
          actionLabel="Tính chi tiết nhân công"
          icon={<UsersRound />}
          onAction={() => setModal("labor")}
        />
        <CostField
          label="Chi phí chung / mẻ"
          value={values.overheadCostPerBatch}
          onChange={(value) => onChange({ overheadCostPerBatch: value })}
          actionLabel={enableOverheadCalculator ? "Tính chi phí chung" : undefined}
          icon={<Settings2 />}
          onAction={enableOverheadCalculator ? () => setModal("overhead") : undefined}
          actionDisabled={!overheadSettingsReady}
        />
        <CostField
          label="Hao hụt dự kiến"
          value={values.wastePercent}
          onChange={(value) => {
            onWasteCalculationChange(undefined);
            onChange({ wastePercent: value });
          }}
          suffix="%"
          max={100}
          maximumFractionDigits={2}
          actionLabel="Tính từ sản lượng"
          icon={<Gauge />}
          onAction={() => setModal("waste")}
        />
      </div>

      {modal === "packaging" && (
        <PackagingCostCalculatorModal
          currentPackagingCost={values.packagingCostPerBatch}
          initialLines={packagingCostLines}
          onClose={() => setModal(null)}
          onApply={(packagingCostPerBatch, lines) => {
            onPackagingCostLinesChange(lines);
            onChange({ packagingCostPerBatch });
            setModal(null);
          }}
        />
      )}
      {modal === "labor" && (
        <DirectLaborCalculatorModal
          batchCycleMinutes={batchCycleMinutes}
          currentDirectLaborCost={values.directLaborCostPerBatch}
          initialLines={directLaborCostLines}
          onClose={() => setModal(null)}
          onApply={(directLaborCostPerBatch, lines) => {
            onDirectLaborCostLinesChange(lines);
            onChange({ directLaborCostPerBatch });
            setModal(null);
          }}
        />
      )}
      {modal === "overhead" && (
        <OverheadSettingsModal
          initialSettings={overheadSettings}
          defaultBatchMinutes={batchCycleMinutes}
          currentBatchOverhead={values.overheadCostPerBatch}
          onClose={() => setModal(null)}
          onSaved={(settings, overheadCostPerBatch) => {
            setOverheadSettings(settings);
            onChange({ overheadCostPerBatch });
            setModal(null);
          }}
        />
      )}
      {modal === "waste" && (
        <WasteCalculatorModal
          currentWastePercent={values.wastePercent}
          defaultGoodQuantity={yieldQuantity}
          initialCalculation={wasteCalculation}
          onClose={() => setModal(null)}
          onApply={(wastePercent, calculation) => {
            onWasteCalculationChange(calculation);
            onChange({ wastePercent });
            setModal(null);
          }}
        />
      )}
    </>
  );
}

function CostField({
  label,
  value,
  onChange,
  suffix = "₫",
  max,
  maximumFractionDigits = 0,
  actionLabel,
  icon,
  onAction,
  actionDisabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  max?: number;
  maximumFractionDigits?: number;
  actionLabel?: string;
  icon: React.ReactNode;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-neutral-700">{label}</label>
      <span className="relative mt-1.5 block">
        <FormattedNumberInput
          min={0}
          max={max}
          value={value}
          maximumFractionDigits={maximumFractionDigits}
          onValueChange={(next) => onChange(next ?? 0)}
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-neutral-400">
          {suffix}
        </span>
      </span>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-600 disabled:cursor-wait disabled:text-neutral-400 disabled:hover:bg-transparent [&>svg]:h-3.5 [&>svg]:w-3.5"
        >
          {icon}{actionLabel}
        </button>
      )}
    </div>
  );
}
