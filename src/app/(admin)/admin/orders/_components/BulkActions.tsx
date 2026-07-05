import type { OrderStatus } from "@/types";

type BulkActionsProps = {
  selectedCount: number;
  onBulkUpdate: (status: OrderStatus) => void;
  onClearSelection: () => void;
  isSaving: boolean;
};

export function BulkActions(props: BulkActionsProps) {
  if (props.selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
      <span className="text-sm font-semibold text-brand-700">
        Đã chọn {props.selectedCount} đơn
      </span>
      <div className="flex flex-wrap gap-2">
        <BulkButton
          label="Xác nhận"
          onClick={() => props.onBulkUpdate("confirmed")}
          disabled={props.isSaving}
        />
        <BulkButton
          label="Đang chuẩn bị"
          onClick={() => props.onBulkUpdate("preparing")}
          disabled={props.isSaving}
        />
        <BulkButton
          label="Hoàn thành"
          onClick={() => props.onBulkUpdate("completed")}
          disabled={props.isSaving}
        />
        <button
          onClick={props.onClearSelection}
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-white"
        >
          Bỏ chọn
        </button>
      </div>
    </div>
  );
}

function BulkButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
