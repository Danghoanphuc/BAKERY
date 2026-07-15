import { BottomSheet } from "@/components/common";
import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { formatPrice } from "@/lib/utils";
import {
  getCartItemFlavorLabel,
  getCartItemSizeLabel,
  type CartItem,
} from "@/types";

export function CheckoutOrderItemsSheet({
  isOpen,
  items,
  onClose,
  onEditCart,
}: {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onEditCart: () => void;
}) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Sản phẩm trong đơn"
      contentClassName="px-4 pb-5"
      footer={
        <button
          type="button"
          onClick={onEditCart}
          className="h-12 w-full rounded-[14px] border border-[#d9aa9d] bg-[#fff8f5] text-sm font-black text-[#a74434]"
        >
          Chỉnh sửa giỏ hàng
        </button>
      }
    >
      <div className="pb-2 pt-1">
        <h2 className="text-lg font-black text-[#3d2417]">
          Sản phẩm trong đơn
        </h2>
        <p className="mt-1 text-sm font-semibold text-[#7b6254]">
          Kiểm tra lại tùy chọn trước khi đặt hàng.
        </p>
      </div>
      <div className="mt-3 divide-y divide-[#f1e5db]">
        {items.map((item) => (
          <article key={item.cartItemId} className="flex gap-3 py-3 first:pt-0">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[13px] bg-[#fff4ec]">
              <ProductImage src={item.imageUrl} alt={item.productName} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-2 text-sm font-black text-[#3d2417]">
                  {item.productName} × {item.quantity}
                </h3>
                <p className="shrink-0 text-sm font-black text-[#b84a39]">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
              <p className="mt-1 text-xs font-semibold leading-5 text-[#8c7568]">
                {getCustomizationLabel(item) || "Mặc định"}
              </p>
              {item.customMessage ? (
                <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-[#8c7568]">
                  “{item.customMessage}”
                </p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </BottomSheet>
  );
}

function getCustomizationLabel(item: CartItem) {
  return [
    getCartItemSizeLabel(item) && `Size ${getCartItemSizeLabel(item)}`,
    getCartItemFlavorLabel(item) && `Vị ${getCartItemFlavorLabel(item)}`,
    item.candles && `${item.candles} nến`,
  ]
    .filter(Boolean)
    .join(" · ");
}
