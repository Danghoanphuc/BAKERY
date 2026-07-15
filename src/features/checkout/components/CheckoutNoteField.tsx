"use client";

import { useState } from "react";
import { ChevronDown, MessageSquarePlus } from "lucide-react";

export function CheckoutNoteField({
  value,
  isPickup,
  onChange,
}: {
  value: string;
  isPickup: boolean;
  onChange: (value: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(Boolean(value));

  return (
    <section className="rounded-[17px] border border-[#f0dfcc] bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
        aria-expanded={isExpanded}
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0 text-[#b84a39]" />
        <span className="min-w-0 flex-1 truncate text-sm font-black text-[#3d2417]">
          {value ? value : "Thêm ghi chú cho tiệm"}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#9b8171] transition ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>
      {isExpanded ? (
        <div className="border-t border-[#f4e9df] p-2.5">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={2}
            maxLength={300}
            className="w-full resize-none rounded-[13px] border border-[#eadbcc] px-3 py-2 text-sm outline-none focus:border-[#b84a39] focus:ring-2 focus:ring-[#b84a39]/15"
            placeholder={
              isPickup
                ? "Ví dụ: Tôi muốn nhận bánh lúc 17:30"
                : "Ví dụ: Gọi trước khi giao..."
            }
          />
        </div>
      ) : null}
    </section>
  );
}
