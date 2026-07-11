"use client";

import { useEffect, useState } from "react";

import {
  getSelectableCustomerVouchers,
  type CustomerRewardsPayload,
  type CustomerVoucher,
  type SelectableCustomerVoucher,
} from "./customer-vouchers";

type VoucherPayload = { vouchers?: CustomerVoucher[] };

let voucherRequest: Promise<SelectableCustomerVoucher[]> | undefined;

export function useAvailableVouchers() {
  const [vouchers, setVouchers] = useState<SelectableCustomerVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    loadAvailableVouchers()
      .then((items) => {
        if (!cancelled) setVouchers(items);
      })
      .catch(() => {
        if (!cancelled) setError("Chưa tải được ưu đãi. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { vouchers, isLoading, error };
}

async function loadAvailableVouchers() {
  voucherRequest ??= fetchVoucherSources().catch((error) => {
    voucherRequest = undefined;
    throw error;
  });
  return voucherRequest;
}

async function fetchVoucherSources() {
  const [publicResult, rewardsResult] = await Promise.allSettled([
    fetchJson<VoucherPayload>("/api/vouchers/public"),
    fetchJson<CustomerRewardsPayload>("/api/rewards"),
  ]);

  const publicVouchers =
    publicResult.status === "fulfilled"
      ? (publicResult.value.vouchers ?? []).map((voucher) => ({
          ...voucher,
          unlocked: true,
        }))
      : [];
  const memberVouchers =
    rewardsResult.status === "fulfilled" ? rewardsResult.value.vouchers ?? [] : [];
  const selectable = getSelectableCustomerVouchers({
    vouchers: [...memberVouchers, ...publicVouchers],
  });

  if (publicResult.status === "rejected" && rewardsResult.status === "rejected") {
    throw new Error("All voucher sources failed");
  }

  return Array.from(new Map(selectable.map((voucher) => [voucher.id, voucher])).values());
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${url}`);
  return response.json() as Promise<T>;
}
