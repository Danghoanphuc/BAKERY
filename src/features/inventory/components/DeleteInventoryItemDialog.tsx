"use client";

import { Loader2, Trash2, X } from "lucide-react";
import type { Product } from "@/types";

export function DeleteInventoryItemDialog({
  product,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  product: Product | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!product) return null;
  const itemLabel =
    product.itemType === "ingredient"
      ? "nguyên liệu"
      : product.itemType === "semi_finished"
        ? "bán thành phẩm"
        : "thành phẩm";

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onCancel();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-inventory-item-title"
        aria-describedby="delete-inventory-item-description"
        className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-[var(--shadow-float)]"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-red-200 bg-red-50 text-red-700">
            <Trash2 className="h-5 w-5" />
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h2
          id="delete-inventory-item-title"
          className="mt-4 text-lg font-black text-neutral-950"
        >
          Xóa {itemLabel} này?
        </h2>
        <p
          id="delete-inventory-item-description"
          className="mt-2 text-sm leading-6 text-neutral-600"
        >
          “{product.name}” sẽ bị xóa khỏi danh mục kho. Lịch sử giá vốn và BOM
          đã phát sinh vẫn được giữ để không làm sai báo cáo.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-40"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-55"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Xóa mã kho
          </button>
        </div>
      </section>
    </div>
  );
}
