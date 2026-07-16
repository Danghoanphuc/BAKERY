import { X } from "lucide-react";

export interface NewDealerForm {
  name: string;
  phone: string;
  email: string;
  address: string;
  district: string;
  city: string;
  type: string;
  businessLicense: string;
  taxId: string;
  contactPerson: string;
  contactPhone: string;
  notes: string;
  creditLimit: string;
  paymentTerms: string;
}

interface DealerCreateModalProps {
  form: NewDealerForm;
  isSaving: boolean;
  onChange: (form: NewDealerForm) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function DealerCreateModal({
  form,
  isSaving,
  onChange,
  onClose,
  onSubmit,
}: DealerCreateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-[#3d2417]">Thêm đại lý mới</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#7b6254] transition hover:bg-[#f0e1d2]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Tên đại lý *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Nhập tên đại lý"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Số điện thoại *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => onChange({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="0xxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChange({ ...form, email: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Loại hình *
              </label>
              <select
                required
                value={form.type}
                onChange={(e) => onChange({ ...form, type: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
              >
                <option value="">Chọn loại hình</option>
                <option value="retail">Cửa hàng lẻ</option>
                <option value="restaurant">Nhà hàng</option>
                <option value="cafe">Quán cafe</option>
                <option value="other">Khác</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#3d2417]">
                Địa chỉ *
              </label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => onChange({ ...form, address: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Số nhà, tên đường"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Quận/Huyện *
              </label>
              <input
                type="text"
                required
                value={form.district}
                onChange={(e) => onChange({ ...form, district: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Quận/Huyện"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Thành phố *
              </label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => onChange({ ...form, city: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Thành phố"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Giấy phép kinh doanh
              </label>
              <input
                type="text"
                value={form.businessLicense}
                onChange={(e) => onChange({ ...form, businessLicense: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Số giấy phép"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Mã số thuế
              </label>
              <input
                type="text"
                value={form.taxId}
                onChange={(e) => onChange({ ...form, taxId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Mã số thuế"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Người liên hệ
              </label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => onChange({ ...form, contactPerson: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Tên người liên hệ"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Điện thoại người liên hệ
              </label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => onChange({ ...form, contactPhone: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="0xxxxxxxxx"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Hạn mức nợ (VNĐ)
              </label>
              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) => onChange({ ...form, creditLimit: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="5000000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3d2417]">
                Điều kiện thanh toán
              </label>
              <select
                value={form.paymentTerms}
                onChange={(e) => onChange({ ...form, paymentTerms: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
              >
                <option value="cod">COD (Thanh toán ngay)</option>
                <option value="net_7">NET 7 (7 ngày)</option>
                <option value="next_order">Đơn tiếp theo</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#3d2417]">
                Ghi chú
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => onChange({ ...form, notes: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-lg border border-[#f0e1d2] px-3 py-2 text-sm text-[#3d2417] focus:border-[#b84a39] focus:outline-none focus:ring-1 focus:ring-[#b84a39]"
                placeholder="Ghi chú thêm về đại lý"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-[#f0e1d2] bg-white px-4 py-2 text-sm font-semibold text-[#7b6254] transition hover:bg-[#fffaf6] disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-[#b84a39] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c94c5c] disabled:opacity-50"
            >
              {isSaving ? "Đang tạo..." : "Tạo đại lý"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
