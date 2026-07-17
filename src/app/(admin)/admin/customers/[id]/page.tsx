"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Loader2,
  PhoneCall,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import type { Customer } from "@/types";

function formatDateTime(value?: Date | string) {
  if (!value) return "Chưa có";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ id }) => setCustomerId(id));
  }, [params]);

  async function loadCustomer(id: string) {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/customers/${id}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Không thể tải khách hàng");
      }

      setCustomer(data as Customer);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load customer:", loadError);
      setError(
        loadError instanceof Error ? loadError.message : "Không thể tải khách hàng",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) {
      loadCustomer(customerId);
    }
  }, [customerId]);

  async function verifyPhone() {
    if (!customerId) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}/crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_phone",
          note: "Nhân viên đã gọi xác nhận số điện thoại với khách.",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Không thể xác minh số điện thoại");
      }

      await loadCustomer(customerId);
      toast.success("Đã xác minh số điện thoại khách hàng.");
    } catch (saveError) {
      console.error("Failed to verify phone:", saveError);
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Không thể xác minh số điện thoại",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCurrentCustomer() {
    if (!customerId || !customer) return;

    const confirmed = window.confirm(
      `Xoá khách hàng "${customer.name}"? Thao tác này không thể hoàn tác.`,
    );

    if (!confirmed) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Không thể xoá khách hàng");
      }

      toast.success(`Đã xoá khách hàng “${customer.name}”.`);
      router.push("/admin/customers");
    } catch (deleteError) {
      console.error("Failed to delete customer:", deleteError);
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xoá khách hàng",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center text-neutral-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Đang tải hồ sơ khách hàng...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? "Không tìm thấy khách hàng."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <UserRound className="h-7 w-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-neutral-950">
                  {customer.name}
                </h1>
                {customer.phoneVerifiedAt && (
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-600">{customer.phone}</p>
              {customer.email && (
                <p className="text-sm text-neutral-500">{customer.email}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={verifyPhone}
              disabled={isSaving || Boolean(customer.phoneVerifiedAt)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PhoneCall className="h-4 w-4" />
              {customer.phoneVerifiedAt ? "Đã xác minh số" : "Đã gọi xác nhận & lưu số"}
            </button>
            <button
              type="button"
              onClick={deleteCurrentCustomer}
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Xoá khách
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-bold text-neutral-950">Hồ sơ</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">Kênh ưu tiên</dt>
              <dd className="font-medium text-neutral-900">
                {customer.preferredChannel ?? "phone"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Tag</dt>
              <dd className="font-medium text-neutral-900">
                {customer.tags?.join(", ") || "Chưa có"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Ghi chú nội bộ</dt>
              <dd className="font-medium text-neutral-900">
                {customer.internalNotes || "Chưa có"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-bold text-neutral-950">Tích lũy</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">Điểm hiện có</dt>
              <dd className="text-2xl font-bold text-neutral-950">
                {customer.loyaltyPoints.toLocaleString("vi-VN")}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Hạng</dt>
              <dd className="font-medium text-neutral-900">{customer.tier}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="font-bold text-neutral-950">Xác minh</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-neutral-500">Trạng thái</dt>
              <dd className="font-medium text-neutral-900">
                {customer.phoneVerifiedAt ? "Đã xác minh" : "Chưa xác minh"}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500">Thời gian</dt>
              <dd className="font-medium text-neutral-900">
                {formatDateTime(customer.phoneVerifiedAt)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
