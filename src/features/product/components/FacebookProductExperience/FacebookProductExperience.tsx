"use client";

import { useRouter } from "next/navigation";

import { ProductImage } from "@/components/common/ProductImage/ProductImage";
import { ProductDetailModal } from "@/features/product/components/ProductDetailModal";
import {
  buildProductCartItem,
  type ProductCustomization,
} from "@/features/product/product-cart";
import { getProductPath } from "@/lib/product-path";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

interface FacebookProductExperienceProps {
  product: Product;
}

export function FacebookProductExperience({
  product,
}: FacebookProductExperienceProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const addAndNavigate = (
    customization: ProductCustomization,
    destination: "/cart" | "/checkout",
  ) => {
    addItem(buildProductCartItem(product, customization));
    router.push(destination);
  };

  return (
    <div className="min-h-[70vh] bg-[#fffaf5]" data-facebook-product-experience>
      <article className="mx-auto flex min-h-[70vh] w-full max-w-[480px] flex-col items-center justify-center px-6 text-center">
        <div className="h-32 w-32 overflow-hidden rounded-[24px] shadow-sm">
          <ProductImage src={product.imageUrl} alt={product.name} />
        </div>
        <h1 className="mt-4 text-xl font-black text-[#3d2417]">
          {product.name}
        </h1>
        <p className="mt-1 font-black text-[#b84a39]">
          {formatPrice(product.price)}
        </p>
        <p className="mt-3 text-sm font-semibold text-[#7b6254]">
          Đang mở tùy chọn sản phẩm…
        </p>
      </article>
      <ProductDetailModal
        product={product}
        isOpen
        onClose={() => router.push("/")}
        onAddToCart={(customization) =>
          addAndNavigate(customization, "/cart")
        }
        onBuyNow={(customization) =>
          addAndNavigate(customization, "/checkout")
        }
      />
      <noscript>
        <p className="mx-auto max-w-md p-6 text-center text-sm text-[#65483a]">
          Vui lòng bật JavaScript để chọn tùy chỉnh và đặt sản phẩm này. Bạn
          cũng có thể mở trang sản phẩm tại {getProductPath(product)}.
        </p>
      </noscript>
    </div>
  );
}
