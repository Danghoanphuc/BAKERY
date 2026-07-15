import { ArrowLeft } from "lucide-react";

export function CheckoutHeader({
  isPickup,
  onBack,
}: {
  isPickup: boolean;
  onBack: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 -mx-3.5 mb-2.5 flex items-center justify-between border-b border-white/70 bg-bg-main/90 px-3.5 py-2.5 backdrop-blur-[18px]">
      <button
        type="button"
        onClick={onBack}
        className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#3d2417] shadow-sm"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#b84a39]">
          {isPickup ? "Tự đến lấy" : "Giao tận nơi"}
        </p>
        <h1 className="text-[17px] font-black text-[#3d2417]">
          Xác nhận đơn hàng
        </h1>
      </div>
      <div className="h-9 w-9" />
    </header>
  );
}
