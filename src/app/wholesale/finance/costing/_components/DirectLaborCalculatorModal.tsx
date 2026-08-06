/* Hallmark · pre-emit critique: P4 H5 E4 S5 R4 V4 */
/* Hallmark · component: direct-labor calculator modal · genre: editorial · theme: existing admin system
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: inherited from the existing neutral and brand tokens
 */
"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { FormattedNumberInput } from "@/components/common/FormattedNumberInput";
import { Modal } from "@/components/common/Modal";
import {
  calculateDirectLaborCost,
  calculateDirectLaborLineCost,
} from "@/features/wholesale-finance/domain/recipe-supplemental-costs";
import type { RecipeDirectLaborCostLine } from "@/types";

export { calculateDirectLaborLineCost } from "@/features/wholesale-finance/domain/recipe-supplemental-costs";

interface DirectLaborCalculatorModalProps {
  batchCycleMinutes: number;
  currentDirectLaborCost: number;
  initialLines: RecipeDirectLaborCostLine[];
  onClose: () => void;
  onApply: (
    directLaborCostPerBatch: number,
    lines: RecipeDirectLaborCostLine[],
  ) => void;
}

let lineSequence = 0;

function createLine(): RecipeDirectLaborCostLine {
  lineSequence += 1;
  return {
    id: `labor-line-${lineSequence}`,
    role: "",
    people: 1,
    minutes: 0,
    hourlyRate: 0,
  };
}

export function DirectLaborCalculatorModal({
  batchCycleMinutes,
  currentDirectLaborCost,
  initialLines,
  onClose,
  onApply,
}: DirectLaborCalculatorModalProps) {
  const [lines, setLines] = useState<RecipeDirectLaborCostLine[]>(() =>
    initialLines.length > 0
      ? initialLines.map((line) => ({ ...line }))
      : [createLine()],
  );

  const total = useMemo(() => calculateDirectLaborCost(lines), [lines]);

  function updateLine(
    id: string,
    patch: Partial<RecipeDirectLaborCostLine>,
  ) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function removeLine(id: string) {
    setLines((current) =>
      current.length > 1
        ? current.filter((line) => line.id !== id)
        : [createLine()],
    );
  }

  function apply() {
    if (total <= 0 || lines.some((line) => !line.role.trim())) {
      toast.error(
        "Nhập vai trò, số người, thời gian và đơn giá công để tính.",
      );
      return;
    }
    onApply(total, lines);
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Tính nhân công trực tiếp cho mẻ"
      className="lg:max-w-4xl"
      contentClassName="max-h-[72vh]"
      headerContent={
        <div className="space-y-1 text-sm text-neutral-600">
          <p>
            Chỉ tính thời gian công nhân thực sự thao tác hoặc bắt buộc đứng
            canh. Không tính thời gian ủ, nghỉ hay chờ khi họ có thể làm mẻ
            khác.
          </p>
          {batchCycleMinutes > 0 && (
            <p className="text-xs text-neutral-500">
              Chu kỳ của mẻ là{" "}
              <strong className="text-neutral-700">
                {batchCycleMinutes} phút
              </strong>
              ; con số này chỉ để tham khảo, không tự động tính thành giờ công.
            </p>
          )}
        </div>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-neutral-500">
            Tổng nhân công của mẻ:{" "}
            <strong className="text-neutral-950">{formatMoney(total)}</strong>
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
              disabled={total <= 0}
              className="h-10 flex-1 whitespace-nowrap rounded-xl bg-neutral-950 px-4 text-sm font-bold text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 active:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Áp dụng vào BOM
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-200 pb-3">
          <div>
            <h3 className="text-sm font-black text-neutral-950">
              Người tham gia sản xuất
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Thành tiền = số người × phút thao tác mỗi người ÷ 60 × đơn
              giá/giờ.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setLines((current) => [
                ...current,
                createLine(),
              ])
            }
            className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-neutral-300 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-700 active:bg-neutral-100"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Thêm nhóm
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => {
            const lineCost = calculateDirectLaborLineCost(line);
            return (
              <section
                key={line.id}
                aria-label={`Nhóm nhân công ${index + 1}`}
                className="rounded-xl border border-neutral-200 p-3"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(160px,1.3fr)_100px_120px_minmax(150px,1fr)_120px_40px] lg:items-end">
                  <TextField
                    label="Vai trò hoặc công đoạn"
                    value={line.role}
                    placeholder="Ví dụ: Thợ làm bánh"
                    onChange={(role) => updateLine(line.id, { role })}
                  />
                  <NumberField
                    label="Số người"
                    value={line.people}
                    onChange={(people) => updateLine(line.id, { people })}
                  />
                  <NumberField
                    label="Phút thao tác/người"
                    value={line.minutes}
                    onChange={(minutes) => updateLine(line.id, { minutes })}
                  />
                  <NumberField
                    label="Đơn giá công/giờ"
                    value={line.hourlyRate}
                    onChange={(hourlyRate) =>
                      updateLine(line.id, { hourlyRate })
                    }
                    suffix="₫"
                  />
                  <div>
                    <p className="text-[11px] font-bold text-neutral-500">
                      Thành tiền
                    </p>
                    <p className="mt-2 text-sm font-black text-neutral-950">
                      {formatMoney(lineCost)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="grid h-10 w-10 place-items-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 active:bg-red-100"
                    aria-label={`Xóa nhóm nhân công ${index + 1}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-xl bg-neutral-950 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <UsersRound
              aria-hidden="true"
              className="h-4 w-4 text-white/60"
            />
            <span className="text-xs font-bold">Tổng nhân công trực tiếp</span>
          </div>
          <strong className="text-lg font-black">{formatMoney(total)}</strong>
        </div>

        {currentDirectLaborCost > 0 && (
          <p className="text-xs text-neutral-500">
            BOM đang có{" "}
            <strong className="text-neutral-800">
              {formatMoney(currentDirectLaborCost)}
            </strong>
            . “Áp dụng vào BOM” sẽ thay giá trị này bằng tổng vừa tính.
          </p>
        )}
      </div>
    </Modal>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-neutral-600">
        {label}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none placeholder:text-neutral-400 hover:border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-neutral-600">
        {label}
      </span>
      <span className="relative block">
        <FormattedNumberInput
          min={0}
          value={value}
          onValueChange={(nextValue) => onChange(nextValue ?? 0)}
          className={`h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none hover:border-neutral-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${suffix ? "pr-9" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-neutral-400">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
