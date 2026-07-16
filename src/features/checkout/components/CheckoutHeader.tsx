import { ArrowLeft } from "lucide-react";

export function CheckoutHeader({
  isPickup,
  onBack,
}: {
  isPickup: boolean;
  onBack: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-3.5 mb-3 flex items-center justify-between border-b border-sand bg-bg-main/95 px-3.5 py-3 backdrop-blur-md">
      <button
        type="button"
        onClick={onBack}
        className="grid h-10 w-10 place-items-center rounded-xl border border-sand bg-bg-card text-navy shadow-sm"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="text-center">
        <p className="brand-eyebrow text-[10px]">
          {isPickup ? "Tự đến lấy" : "Giao tận nơi"}
        </p>
        <h1 className="brand-heading text-lg">
          Xác nhận đơn hàng
        </h1>
      </div>
      <div className="h-9 w-9" />
    </header>
  );
}
