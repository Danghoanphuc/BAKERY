export const STANDARD_DELIVERY_FEE = 20_000;
export const FREE_SHIPPING_MINIMUM = 149_000;

export type ShippingBenefit = {
  fee: number;
  isFree: boolean;
  remainingForFreeShipping: number;
};

export function getShippingBenefit(
  subtotal: number,
  deliveryMode: "delivery" | "pickup",
): ShippingBenefit {
  if (deliveryMode === "pickup") {
    return { fee: 0, isFree: true, remainingForFreeShipping: 0 };
  }

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_MINIMUM - subtotal);
  return {
    fee: remainingForFreeShipping === 0 ? 0 : STANDARD_DELIVERY_FEE,
    isFree: remainingForFreeShipping === 0,
    remainingForFreeShipping,
  };
}
