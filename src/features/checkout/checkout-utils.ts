import type { CustomerAddressBookEntry, OrderConfig } from "@/types";

export function getAddressText(address?: OrderConfig["deliveryAddress"]) {
  if (!address) return "";
  return (
    address.formattedAddress ||
    [address.street, address.district, address.city].filter(Boolean).join(", ")
  );
}

export function getDestinationLabel(config: OrderConfig, isPickup: boolean) {
  if (isPickup) return "Nhận tại cửa hàng chính";
  return config.deliveryAddress
    ? getAddressText(config.deliveryAddress)
    : "Chưa chọn địa chỉ giao hàng";
}

export function getTimingLabel(config: OrderConfig, isPickup: boolean) {
  if (config.orderTiming.type !== "scheduled") {
    return isPickup ? "Nhận sớm nhất có thể" : "Giao sớm nhất có thể";
  }

  const { scheduledDate, scheduledTime } = config.orderTiming;
  return (
    [scheduledTime, scheduledDate].filter(Boolean).join(" · ") ||
    "Theo lịch đã chọn"
  );
}

export function getScheduledOrderTime(config: OrderConfig) {
  const { orderTiming } = config;
  if (
    orderTiming.type !== "scheduled" ||
    !orderTiming.scheduledDate ||
    !orderTiming.scheduledTime
  ) {
    return undefined;
  }

  return new Date(`${orderTiming.scheduledDate}T${orderTiming.scheduledTime}`);
}

export function getDefaultAddress(addressBook?: CustomerAddressBookEntry[]) {
  if (!addressBook?.length) return undefined;
  return addressBook.find((address) => address.isDefault) || addressBook[0];
}

export function toDeliveryAddress(
  address: CustomerAddressBookEntry,
): NonNullable<OrderConfig["deliveryAddress"]> {
  return {
    street: address.street,
    district: address.district,
    city: address.city,
    lat: address.lat,
    lng: address.lng,
    formattedAddress: address.formattedAddress,
    placeId: address.placeId,
  };
}
