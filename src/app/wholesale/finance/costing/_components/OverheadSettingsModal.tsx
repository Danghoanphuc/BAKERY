"use client";

import { FormEvent, useMemo, useState } from "react";
import { Calculator, Clock3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import { Modal } from "@/components/common/Modal";
import {
  calculateManufacturingOverheadRate,
  calculateMonthlyManufacturingOverhead,
  calculateOverheadForBatch,
} from "@/features/wholesale-finance/domain/manufacturing-overhead";
import type { ManufacturingOverheadSettings } from "@/types";

interface OverheadSettingsModalProps {
  initialSettings: ManufacturingOverheadSettings;
  defaultBatchMinutes: number;
  currentBatchOverhead: number;
  onClose: () => void;
  onSaved: (
    settings: ManufacturingOverheadSettings,
    overheadCostPerBatch: number,
  ) => void;
}

const MONTHLY_COST_FIELDS: Array<{
  field: keyof ManufacturingOverheadSettings;
  label: string;
  helper: string;
}> = [
  {
    field: "utilitiesPerMonth",
    label: "Điện, nước, gas / tháng",
    helper: "Phần dùng cho khu vực sản xuất.",
  },
  {
    field: "equipmentDepreciationPerMonth",
    label: "Khấu hao máy móc / tháng",
    helper: "Lò, máy trộn, tủ đông và thiết bị sản xuất.",
  },
  {
    field: "premisesPerMonth",
    label: "Mặt bằng sản xuất / tháng",
    helper: "Tiền thuê hoặc chi phí sử dụng khu vực sản xuất.",
  },
  {
    field: "maintenancePerMonth",
    label: "Bảo trì, vệ sinh / tháng",
    helper: "Bảo dưỡng máy và vệ sinh khu sản xuất.",
  },
  {
    field: "otherIndirectCostsPerMonth",
    label: "Chi phí gián tiếp khác / tháng",
    helper: "Chỉ nhập khoản chưa nằm trong các nhóm trên.",
  },
];

export function OverheadSettingsModal({
  initialSettings,
  defaultBatchMinutes,
  currentBatchOverhead,
  onClose,
  onSaved,
}: OverheadSettingsModalProps) {
  const [draft, setDraft] =
    useState<ManufacturingOverheadSettings>(initialSettings);
  const [batchMinutes, setBatchMinutes] = useState(defaultBatchMinutes);
  const [saving, setSaving] = useState(false);

  const calculation = useMemo(() => {
    const monthlyTotal = calculateMonthlyManufacturingOverhead(draft);
    const hourlyRate = calculateManufacturingOverheadRate(draft);
    const batchCost = calculateOverheadForBatch(draft, batchMinutes);
    return { monthlyTotal, hourlyRate, batchCost };
  }, [batchMinutes, draft]);

  function update(
    field: keyof ManufacturingOverheadSettings,
    value: number | null,
  ) {
    setDraft((current) => ({ ...current, [field]: value ?? 0 }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    // This modal can be rendered from inside the product editor form. React
    // submit events still bubble through portals, so without this guard the
    // product form also submits and navigates back to /wholesale/inventory.
    event.stopPropagation();
    if (draft.productiveHoursPerMonth <= 0) {
      toast.error("Nhập số giờ sản xuất hữu ích lớn hơn 0.");
      return;
    }
    if (batchMinutes <= 0) {
      toast.error("Nhập thời gian sản xuất của một mẻ để tính chi phí.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        "/api/wholesale/finance/overhead-settings",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      if (!response.ok) throw new Error("SAVE_FAILED");
      const saved = (await response.json()) as ManufacturingOverheadSettings;
      onSaved(saved, calculateOverheadForBatch(saved, batchMinutes));
      toast.success("Đã điền chi phí chung vào BOM đang chỉnh. Lưu BOM nháp để ghi phiên bản.");
    } catch {
      toast.error("Không thể lưu cấu hình chi phí chung.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Thiết lập chi phí chung sản xuất"
      className="lg:max-w-3xl"
      contentClassName="max-h-[72vh]"
      headerContent={
        <p className="text-sm text-neutral-600">
          Nhập chi phí gián tiếp theo tháng. Hệ thống chia theo giờ sản xuất,
          sau đó phân bổ vào từng mẻ.
        </p>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Mẻ này sẽ nhận{" "}
            <strong className="text-neutral-900">
              {formatMoney(calculation.batchCost)}
            </strong>{" "}
            chi phí chung.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 flex-1 rounded-xl border border-neutral-300 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50 sm:flex-none"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="manufacturing-overhead-form"
              disabled={saving}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50 sm:flex-none"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu cấu hình & điền vào BOM
            </button>
          </div>
        </div>
      }
    >
      <form
        id="manufacturing-overhead-form"
        onSubmit={save}
        className="space-y-6"
      >
        <section aria-labelledby="monthly-overhead-heading">
          <div className="border-b border-neutral-200 pb-3">
            <h3
              id="monthly-overhead-heading"
              className="text-sm font-black text-neutral-950"
            >
              1. Các khoản chi phí gián tiếp
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Không nhập nguyên liệu, bao bì hoặc lương trực tiếp tại đây để
              tránh tính hai lần.
            </p>
          </div>
          <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {MONTHLY_COST_FIELDS.map(({ field, label, helper }) => (
              <AmountField
                key={field}
                label={label}
                helper={helper}
                value={draft[field]}
                onChange={(value) => update(field, value)}
              />
            ))}
          </div>
        </section>

        <section
          aria-labelledby="allocation-basis-heading"
          className="border-t border-neutral-200 pt-5"
        >
          <h3
            id="allocation-basis-heading"
            className="text-sm font-black text-neutral-950"
          >
            2. Cơ sở phân bổ
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AmountField
              label="Giờ sản xuất hữu ích / tháng"
              helper="Tổng số giờ máy và khu sản xuất thực sự chạy trong tháng."
              value={draft.productiveHoursPerMonth}
              onChange={(value) => update("productiveHoursPerMonth", value)}
              suffix="giờ"
              maximumFractionDigits={1}
            />
            <AmountField
              label="Thời gian sản xuất mẻ này"
              helper="Mặc định lấy từ thời gian sản xuất của thành phẩm."
              value={batchMinutes}
              onChange={(value) => setBatchMinutes(value ?? 0)}
              suffix="phút"
            />
          </div>
        </section>

        <section
          aria-label="Kết quả phân bổ"
          className="grid overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 sm:grid-cols-3 sm:divide-x sm:divide-neutral-200"
        >
          <Result
            icon={<Calculator />}
            label="Tổng chi phí / tháng"
            value={formatMoney(calculation.monthlyTotal)}
          />
          <Result
            icon={<Clock3 />}
            label="Suất chi phí / giờ"
            value={formatMoney(calculation.hourlyRate)}
          />
          <Result
            icon={<Calculator />}
            label="Phân bổ cho mẻ này"
            value={formatMoney(calculation.batchCost)}
            emphasized
          />
        </section>

        {currentBatchOverhead > 0 && (
          <p className="text-xs text-neutral-500">
            Giá trị đang nhập trong BOM là{" "}
            <strong className="text-neutral-800">
              {formatMoney(currentBatchOverhead)}
            </strong>
            . “Lưu và áp dụng” sẽ thay bằng kết quả vừa tính.
          </p>
        )}
      </form>
    </Modal>
  );
}

function AmountField({
  label,
  helper,
  value,
  onChange,
  suffix = "₫",
  maximumFractionDigits = 0,
}: {
  label: string;
  helper: string;
  value: number;
  onChange: (value: number | null) => void;
  suffix?: string;
  maximumFractionDigits?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-neutral-700">
        {label}
      </span>
      <span className="relative block">
        <FormattedNumberInput
          min={0}
          value={value}
          maximumFractionDigits={maximumFractionDigits}
          onValueChange={onChange}
          className="h-11 w-full rounded-xl border border-neutral-300 bg-white px-3 pr-14 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-neutral-400">
          {suffix}
        </span>
      </span>
      <span className="mt-1 block text-[11px] leading-4 text-neutral-500">
        {helper}
      </span>
    </label>
  );
}

function Result({
  icon,
  label,
  value,
  emphasized = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="border-b border-neutral-200 p-4 last:border-b-0 sm:border-b-0">
      <div className="flex items-center gap-1.5 text-neutral-500 [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p
        className={`mt-2 text-lg font-black ${emphasized ? "text-brand-700" : "text-neutral-950"}`}
      >
        {value}
      </p>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
