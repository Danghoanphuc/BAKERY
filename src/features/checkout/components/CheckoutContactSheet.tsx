import { BottomSheet } from "@/components/common";

export type CheckoutContactForm = {
  name: string;
  phone: string;
};

export function CheckoutContactSheet({
  isOpen,
  value,
  onChange,
  onClose,
}: {
  isOpen: boolean;
  value: CheckoutContactForm;
  onChange: (value: CheckoutContactForm) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Thông tin người nhận"
      contentClassName="px-4 pb-5"
      footer={
        <button
          type="button"
          onClick={onClose}
          disabled={!value.name.trim() || value.phone.length !== 10}
          className="h-12 w-full rounded-[14px] bg-[#b84a39] text-sm font-black text-white disabled:bg-[#d8c8bd]"
        >
          Hoàn tất
        </button>
      }
    >
      <div className="pb-2 pt-1">
        <h2 className="text-lg font-black text-[#3d2417]">
          Thông tin người nhận
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#7b6254]">
          Tiệm sử dụng thông tin này để xác nhận và giao đơn.
        </p>
      </div>
      <div className="mt-3 space-y-3">
        <ContactField
          label="Họ tên"
          value={value.name}
          onChange={(name) => onChange({ ...value, name })}
        />
        <ContactField
          label="Số điện thoại"
          value={value.phone}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          onChange={(phone) => onChange({ ...value, phone })}
        />
      </div>
    </BottomSheet>
  );
}

function ContactField({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric";
  maxLength?: number;
}) {
  return (
    <label className="block text-sm font-black text-[#65483a]">
      {label} <span className="text-[#b84a39]">*</span>
      <input
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-12 w-full rounded-[14px] border border-[#eadbcc] px-3 text-sm font-semibold outline-none focus:border-[#b84a39] focus:ring-2 focus:ring-[#b84a39]/15"
      />
    </label>
  );
}
