import { useState } from "react";
import type { Order, OrderStatus } from "@/types";
import { getPrimaryOrderTransition } from "@/lib/orders/order-workflow";
import { labelForStatus } from "../_lib/constants";

type BulkActionsProps = {
  selectedOrders: Order[];
  onBulkUpdate: (status: OrderStatus) => Promise<void>;
  onClearSelection: () => void;
  isSaving: boolean;
};

export function BulkActions(props: BulkActionsProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  if (props.selectedOrders.length === 0) return null;

  const transitions = props.selectedOrders.map(getPrimaryOrderTransition);
  const targetStatus = transitions[0];
  const hasCommonTransition =
    targetStatus !== null && transitions.every((status) => status === targetStatus);

  async function confirmUpdate() {
    if (!targetStatus) return;
    await props.onBulkUpdate(targetStatus);
    setIsConfirming(false);
  }

  return (
    <section
      aria-label="Thao tác hàng loạt"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3"
    >
      <div>
        <p className="text-sm font-semibold text-brand-700">
          Đã chọn {props.selectedOrders.length} đơn
        </p>
        {!hasCommonTransition && (
          <p className="mt-1 text-xs text-amber-700">
            Các đơn đang ở luồng khác nhau. Hãy chọn các đơn có cùng bước xử lý tiếp theo.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {hasCommonTransition && !isConfirming && (
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            disabled={props.isSaving}
            className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60"
          >
            Chuyển sang {labelForStatus(targetStatus)}
          </button>
        )}
        {hasCommonTransition && isConfirming && (
          <>
            <span className="text-xs font-semibold text-neutral-700">
              Xác nhận cập nhật {props.selectedOrders.length} đơn?
            </span>
            <button
              type="button"
              onClick={() => void confirmUpdate()}
              disabled={props.isSaving}
              className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {props.isSaving ? "Đang cập nhật…" : "Xác nhận"}
            </button>
            <button
              type="button"
              onClick={() => setIsConfirming(false)}
              disabled={props.isSaving}
              className="rounded-md px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-white"
            >
              Quay lại
            </button>
          </>
        )}
        <button
          type="button"
          onClick={props.onClearSelection}
          disabled={props.isSaving}
          className="rounded-md px-3 py-1.5 text-sm font-semibold text-neutral-600 hover:bg-white disabled:opacity-60"
        >
          Bỏ chọn
        </button>
      </div>
    </section>
  );
}
