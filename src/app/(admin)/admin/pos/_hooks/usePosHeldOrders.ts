import { useCallback, useEffect, useState } from "react";
import type { CartItem } from "@/types";
import type { SelectedVoucher } from "@/types/voucher";
import type { PosCustomer } from "../_lib/pos-utils";
import { HeldPosOrder } from "../_lib/pos-utils";

const HELD_ORDERS_STORAGE_KEY = "bakery-pos-held-orders";

type UsePosHeldOrdersReturn = {
  heldOrders: HeldPosOrder[];
  holdOrder: (params: {
    items: CartItem[];
    customer: PosCustomer;
    voucher?: SelectedVoucher;
  }) => void;
  restoreHeldOrder: (order: HeldPosOrder) => {
    items: CartItem[];
    customer: PosCustomer;
    voucher?: SelectedVoucher;
  } | null;
  removeHeldOrder: (orderId: string) => void;
};

export function usePosHeldOrders(): UsePosHeldOrdersReturn {
  const [heldOrders, setHeldOrders] = useState<HeldPosOrder[]>([]);

  useEffect(() => {
    try {
      const savedOrders = localStorage.getItem(HELD_ORDERS_STORAGE_KEY);
      if (savedOrders) {
        setHeldOrders(JSON.parse(savedOrders) as HeldPosOrder[]);
      }
    } catch (storageError) {
      console.error("Failed to load held POS orders:", storageError);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        HELD_ORDERS_STORAGE_KEY,
        JSON.stringify(heldOrders),
      );
    } catch (storageError) {
      console.error("Failed to save held POS orders:", storageError);
    }
  }, [heldOrders]);

  const holdOrder = useCallback(
    ({
      items,
      customer,
      voucher,
    }: {
      items: CartItem[];
      customer: PosCustomer;
      voucher?: SelectedVoucher;
    }) => {
      if (items.length === 0) return;

      setHeldOrders((current) => [
        {
          id: crypto.randomUUID(),
          items,
          customer,
          voucher,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
    },
    [],
  );

  const restoreHeldOrder = useCallback(
    (order: HeldPosOrder) => {
      setHeldOrders((current) => current.filter((item) => item.id !== order.id));
      return {
        items: order.items,
        customer: order.customer,
        voucher: order.voucher,
      };
    },
    [],
  );

  const removeHeldOrder = useCallback((orderId: string) => {
    setHeldOrders((current) => current.filter((item) => item.id !== orderId));
  }, []);

  return {
    heldOrders,
    holdOrder,
    restoreHeldOrder,
    removeHeldOrder,
  };
}
