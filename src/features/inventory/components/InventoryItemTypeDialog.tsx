/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

type InventoryItemTypeDialogProps = {
  isOpen: boolean;
  basePath: string;
  onClose: () => void;
};

const choices = [
  {
    href: "ingredient",
    title: "Nguyên liệu",
    description:
      "Hàng mua đầu vào: đơn vị cơ sở, quy cách mua, giá mua và mức tồn.",
    note: "Chỉ dùng nội bộ, không thể xuất bản ra cửa hàng.",
    imageUrl:
      "https://res.cloudinary.com/da3xfws3n/image/upload/v1784530538/ChatGPT_Image_13_55_21_20_thg_7_2026_3_kkc82m.png",
  },
  {
    href: "semi-finished",
    title: "Bán thành phẩm",
    description:
      "Đầu ra của một công đoạn: sản lượng mẻ, định mức, thời gian và bảo quản.",
    note: "Dùng cho BOM/sản xuất, không phải mặt hàng bán.",
    imageUrl:
      "https://res.cloudinary.com/da3xfws3n/image/upload/v1784530540/ChatGPT_Image_13_55_21_20_thg_7_2026_2_ldtsvu.png",
  },
  {
    href: "finished-product",
    title: "Thành phẩm",
    description:
      "Sản phẩm bán ra: giá bán, nội dung cửa hàng, kênh bán và biến thể SKU.",
    note: "Loại duy nhất có thể publish ra cửa hàng.",
    imageUrl:
      "https://res.cloudinary.com/da3xfws3n/image/upload/v1784530543/ChatGPT_Image_13_55_21_20_thg_7_2026_1_u4yrud.png",
  },
] as const;

export function InventoryItemTypeDialog({
  isOpen,
  basePath,
  onClose,
}: InventoryItemTypeDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] grid place-items-center bg-neutral-950/45 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-item-type-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/70 bg-[#fffdf9] shadow-[var(--shadow-float)]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-brand-600">
              Tạo mã kho mới
            </p>
            <h2
              id="inventory-item-type-title"
              className="mt-1 text-xl font-black tracking-tight text-neutral-950"
            >
              Chọn đúng loại hàng trước khi nhập dữ liệu
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Loại hàng quyết định form, nghiệp vụ và quyền xuất bản; không thể
              đổi sau khi tạo.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-950"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
          {choices.map((choice) => {
            return (
              <Link
                key={choice.href}
                href={`${basePath}/new/${choice.href}`}
                className="group flex min-h-80 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                <div className="relative aspect-square w-full overflow-hidden border-b border-neutral-100 bg-[#f5efe5]">
                  <Image
                    src={choice.imageUrl}
                    alt={`Minh họa ${choice.title.toLowerCase()}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 220px"
                    className="object-cover transition duration-300 group-hover:scale-[1.025]"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-base font-black text-neutral-950">
                    {choice.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {choice.description}
                  </p>
                  <p className="mt-auto border-t border-neutral-100 pt-3 text-xs font-semibold leading-5 text-neutral-500">
                    {choice.note}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
