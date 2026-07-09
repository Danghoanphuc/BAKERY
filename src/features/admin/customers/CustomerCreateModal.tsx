import { X } from "lucide-react";

import { normalizePhoneInput } from "@/lib/auth/phone";
import {
  channelLabels,
  type NewCustomerForm,
  type PreferredChannel,
} from "./customer-crm-utils";

type CustomerCreateModalProps = {
  form: NewCustomerForm;
  isSaving: boolean;
  onChange: (form: NewCustomerForm) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function CustomerCreateModal({
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: CustomerCreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Thêm khách hàng</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Tạo hồ sơ CRM thủ công cho khách tại quầy hoặc qua điện thoại.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 p-5">
          <input
            required
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Tên khách hàng"
          />
          <input
            required
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={form.phone}
            onChange={(event) =>
              onChange({ ...form, phone: normalizePhoneInput(event.target.value) })
            }
            className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Số điện thoại"
          />
          <input
            type="email"
            value={form.email}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
            className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Email nếu có"
          />
          <input
            value={form.tagsText}
            onChange={(event) => onChange({ ...form, tagsText: event.target.value })}
            className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Tag: sinh nhật, khách công ty..."
          />
          <select
            value={form.preferredChannel}
            onChange={(event) =>
              onChange({
                ...form,
                preferredChannel: event.target.value as PreferredChannel,
              })
            }
            className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {Object.entries(channelLabels).map(([value, label]) => (
              <option key={value} value={value}>
                Kênh ưu tiên: {label}
              </option>
            ))}
          </select>
          <textarea
            value={form.internalNotes}
            onChange={(event) =>
              onChange({ ...form, internalNotes: event.target.value })
            }
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            placeholder="Ghi chú nội bộ"
          />
          <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {isSaving ? "Đang lưu..." : "Tạo khách hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
