"use client";

import { useEffect, useState } from "react";

import { BottomSheet } from "@/components/common";
import { AddressModal } from "@/components/layout/Header/AddressModal";
import {
  ProductPurchaseActions,
  ProductPurchaseContent,
} from "@/features/product/components/ProductPurchase";
import { trackProductEvent } from "@/features/product/product-analytics";
import type { ProductCustomization } from "@/features/product/product-cart";
import { useProductConfigurator } from "@/features/product/use-product-configurator";
import { getProductPath } from "@/lib/product-path";
import { markProductSheetReturn } from "@/features/product/product-return";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import type { Product } from "@/types";

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customization: ProductCustomization) => void;
  onBuyNow: (customization: ProductCustomization) => void;
}

export function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductDetailModalProps) {
  const { config } = useOrderConfigStore();
  const configurator = useProductConfigurator(product, "sheet");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      trackProductEvent("product_sheet_open", {
        productId: product.id,
        source: "sheet",
      });
    }
  }, [isOpen, product.id]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={product.name}
      expanded
      className="lg:max-w-4xl"
      footer={
        <ProductPurchaseActions
          product={product}
          configurator={configurator}
          deliveryMode={config.deliveryMode}
          source="sheet"
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
        />
      }
    >
      <ProductPurchaseContent
        product={product}
        configurator={configurator}
        deliveryMode={config.deliveryMode}
        address={config.deliveryAddress?.formattedAddress}
        onChooseAddress={() => setIsAddressModalOpen(true)}
        detailsHref={getProductPath(product)}
        onViewFullDetails={() => {
          markProductSheetReturn(product.id);
          trackProductEvent("view_full_product_clicked", {
            productId: product.id,
            source: "sheet",
            sizeId: configurator.customization.selectedSize,
            flavorId: configurator.customization.selectedFlavor,
          });
        }}
      />
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </BottomSheet>
  );
}
