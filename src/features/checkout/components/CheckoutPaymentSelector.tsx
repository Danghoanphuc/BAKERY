import { Banknote, QrCode } from "lucide-react";
import { clsx } from "clsx";

export type CheckoutPaymentMethod = "cod" | "bank_transfer";

export function CheckoutPaymentSelector({
  value,
  isPickup,
  onChange,
}: {
  value: CheckoutPaymentMethod;
  isPickup: boolean;
  onChange: (method: CheckoutPaymentMethod) => void;
}) {
  const description =
    value === "cod"
      ? isPickup
        ? "Thanh toán trực tiếp khi nhận bánh tại quầy."
        : "Thanh toán sau khi tiệm giao bánh."
      : "Quét QR sau khi đơn được tạo; hệ thống tự đối soát.";

  return (
    <section className="rounded-[17px] border border-[#f0dfcc] bg-white p-2.5 shadow-sm">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#9b8171]">
        Thanh toán
      </p>
      <div className="grid grid-cols-2 gap-2">
        <MethodButton
          active={value === "cod"}
          icon={<Banknote className="h-4 w-4" />}
          label={isPickup ? "Tại quầy" : "Khi nhận"}
          onClick={() => onChange("cod")}
        />
        <MethodButton
          active={value === "bank_transfer"}
          icon={<QrCode className="h-4 w-4" />}
          label="Chuyển khoản"
          onClick={() => onChange("bank_transfer")}
        />
      </div>
      <p className="mt-1.5 text-[11px] font-semibold leading-4 text-[#7b6254]">
        {description}
      </p>
    </section>
  );
}

function MethodButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "flex h-11 items-center justify-center gap-2 rounded-[13px] border text-sm font-black transition",
        active
          ? "border-[#b84a39] bg-[#fff1f0] text-[#a63f30] shadow-sm"
          : "border-[#eadbcc] bg-[#fffaf6] text-[#6f574a]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
