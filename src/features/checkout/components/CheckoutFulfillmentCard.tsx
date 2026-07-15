import {
  ChevronRight,
  Clock3,
  MapPin,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";

type CheckoutFulfillmentCardProps = {
  isPickup: boolean;
  customerName?: string;
  customerPhone?: string;
  isPhoneVerified: boolean;
  destinationLabel: string;
  timingLabel: string;
  onEditContact: () => void;
  onEditDestination?: () => void;
};

export function CheckoutFulfillmentCard({
  isPickup,
  customerName,
  customerPhone,
  isPhoneVerified,
  destinationLabel,
  timingLabel,
  onEditContact,
  onEditDestination,
}: CheckoutFulfillmentCardProps) {
  const hasContact = Boolean(customerName?.trim() && customerPhone?.trim());

  return (
    <section className="overflow-hidden rounded-[17px] border border-[#f0dfcc] bg-white shadow-sm">
      <SummaryButton
        icon={<UserRound className="h-4 w-4" />}
        label="Người nhận"
        value={
          hasContact
            ? `${customerName} · ${customerPhone}`
            : "Chưa có thông tin liên hệ"
        }
        valueTone={hasContact ? "default" : "warning"}
        suffix={
          isPhoneVerified ? (
            <ShieldCheck className="h-4 w-4 text-[#3b8a63]" />
          ) : undefined
        }
        onClick={onEditContact}
      />
      <SummaryButton
        icon={
          isPickup ? (
            <Store className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )
        }
        label={isPickup ? "Điểm nhận bánh" : "Địa chỉ giao bánh"}
        value={destinationLabel}
        onClick={onEditDestination}
      />
      <div className="flex items-center gap-2.5 border-t border-[#f4e9df] px-3.5 py-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#fff4ec] text-[#b84a39]">
          <Clock3 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#9b8171]">
            Thời gian
          </p>
          <p className="mt-0.5 truncate text-sm font-black text-[#3d2417]">
            {timingLabel}
          </p>
        </div>
      </div>
    </section>
  );
}

function SummaryButton({
  icon,
  label,
  value,
  valueTone = "default",
  suffix,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueTone?: "default" | "warning";
  suffix?: React.ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[#fff4ec] text-[#b84a39]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.06em] text-[#9b8171]">
          {label}
        </span>
        <span
          className={`mt-0.5 block truncate text-sm font-black ${valueTone === "warning" ? "text-[#b36a20]" : "text-[#3d2417]"}`}
        >
          {value}
        </span>
      </span>
      {suffix}
      {onClick ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-[#b9a79d]" />
      ) : null}
    </>
  );

  const className =
    "flex w-full items-center gap-2.5 border-b border-[#f4e9df] px-3.5 py-2.5 text-left last:border-b-0";
  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  );
}
