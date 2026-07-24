import { Minus, PauseCircle, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { getCartItemVariantDetails, type CartItem } from "@/types";
import { formatCurrency, HeldPosOrder } from "../_lib/pos-utils";

type PosCartPanelProps = {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  heldOrders: HeldPosOrder[];
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClear: () => void;
  onHoldOrder: () => void;
  onRestoreHeldOrder: (order: HeldPosOrder) => void;
  isLocked?: boolean;
};

export function PosCartPanel({
  items,
  totalQuantity,
  subtotal,
  heldOrders,
  onUpdateQuantity,
  onRemoveItem,
  onClear,
  onHoldOrder,
  onRestoreHeldOrder,
  isLocked = false,
}: PosCartPanelProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col md:flex-none xl:flex-1">
      <div className="flex items-center justify-between border-b border-[#f0e1d2] p-3 xl:p-4">
        <div>
          <h2 className="text-xl font-black text-[#3d2417]">
            Giỏ hàng ({totalQuantity})
          </h2>
          <p className="mt-1 text-xs font-semibold text-[#9b8171]">
            Tạm tính {formatCurrency(subtotal)}
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={isLocked}
            className="grid h-11 w-11 place-items-center rounded-full text-[#9b8171] transition hover:bg-[#fff1f0] hover:text-[#b84a39]"
            aria-label="Xoá giỏ hàng"
            title="Xoá giỏ hàng"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {heldOrders.length > 0 && (
        <div className="border-b border-[#f0e1d2] bg-[#fffaf6] px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9b8171]">
              Đơn tạm giữ
            </p>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#b84a39] ring-1 ring-[#f0e1d2]">
              {heldOrders.length}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {heldOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onRestoreHeldOrder(order)}
                disabled={isLocked}
                className="min-h-11 shrink-0 rounded-xl border border-[#eadbcc] bg-white px-3 py-2 text-left transition hover:border-[#b84a39]/50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <p className="max-w-32 truncate text-xs font-black text-[#3d2417]">
                  {order.customer.name || "Khách lẻ"}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-[#9b8171]">
                  {order.items.reduce((sum, item) => sum + item.quantity, 0)} món
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-3 md:flex-none md:overflow-visible xl:flex-1 xl:overflow-y-auto xl:p-4">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-[#9b8171]">
            <ShoppingCart className="mb-2 h-12 w-12 opacity-30" />
            <p className="text-sm font-semibold">Chưa chọn sản phẩm</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.cartItemId}
                className="grid grid-cols-[48px_1fr_auto] gap-3 rounded-2xl bg-[#fffaf6] p-3 ring-1 ring-[#f0e1d2]"
              >
                <div className="h-12 w-12 overflow-hidden rounded-xl bg-white">
                  <ProductImage
                    src={item.imageUrl}
                    alt={item.productName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#3d2417]">
                    {item.productName}
                  </p>
                  <ItemMeta item={item} />
                  <p className="mt-1 text-sm font-black text-[#b84a39]">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1">
                    <QtyButton
                      label="Giảm"
                      disabled={isLocked}
                      onClick={() =>
                        onUpdateQuantity(
                          item.cartItemId,
                          Math.max(1, item.quantity - 1),
                        )
                      }
                    >
                      <Minus className="h-3 w-3" />
                    </QtyButton>
                    <span className="w-6 text-center text-xs font-black text-[#3d2417]">
                      {item.quantity}
                    </span>
                    <QtyButton
                      label="Tăng"
                      disabled={isLocked}
                      onClick={() =>
                        onUpdateQuantity(item.cartItemId, item.quantity + 1)
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </QtyButton>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.cartItemId)}
                    disabled={isLocked}
                    className="grid h-11 w-11 place-items-center rounded-full text-[#9b8171] transition hover:bg-white hover:text-[#b84a39]"
                    aria-label="Xoá món"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#f0e1d2] bg-white p-3 xl:p-4">
        <button
          type="button"
          onClick={onHoldOrder}
          disabled={items.length === 0 || isLocked}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#eadbcc] bg-[#fffaf6] text-sm font-black text-[#3d2417] transition hover:border-[#b84a39]/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PauseCircle className="h-4 w-4" />
          Giữ đơn hiện tại
        </button>
      </div>
    </section>
  );
}

function ItemMeta({ item }: { item: CartItem }) {
  const details = [
    ...getCartItemVariantDetails(item),
    item.customMessage ? `Chữ: ${item.customMessage}` : null,
    item.candles ? `Nến: ${item.candles}` : null,
  ].filter(Boolean);

  if (details.length === 0) return null;

  return (
    <p className="mt-0.5 truncate text-xs font-semibold text-[#9b8171]">
      {details.join(" / ")}
    </p>
  );
}

function QtyButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-11 w-11 place-items-center rounded-full border border-[#eadbcc] bg-white text-[#65483a] disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={label}
    >
      {children}
    </button>
  );
}
