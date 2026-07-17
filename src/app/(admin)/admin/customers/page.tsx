"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { getVietnamPhoneValidationError, normalizePhoneInput } from "@/lib/auth/phone";
import { getAllOrders } from "@/lib/firebase";
import type { Customer, CustomerInput, Order } from "@/types";
import {
  buildCustomerRows,
  CustomerCreateModal,
  CustomerStatsCards,
  CustomerTable,
  filterCustomerRows,
  getCustomerStats,
  initialNewCustomerForm,
  splitTags,
  type CustomerFilters,
  type NewCustomerForm,
} from "@/features/admin/customers";

const initialFilters: CustomerFilters = {
  query: "",
  risk: "all",
  verification: "all",
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filters, setFilters] = useState<CustomerFilters>(initialFilters);
  const [newCustomer, setNewCustomer] =
    useState<NewCustomerForm>(initialNewCustomerForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setIsLoading(true);
      const [customersResponse, loadedOrders] = await Promise.all([
        fetch("/api/customers", { cache: "no-store" }),
        getAllOrders(),
      ]);

      if (!customersResponse.ok) {
        throw new Error("Không thể tải danh sách khách hàng");
      }

      setCustomers((await customersResponse.json()) as Customer[]);
      setOrders(loadedOrders);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load customers:", loadError);
      setError("Không thể tải dữ liệu khách hàng.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const rows = useMemo(
    () => buildCustomerRows(customers, orders),
    [customers, orders],
  );
  const filteredRows = useMemo(
    () => filterCustomerRows(rows, filters),
    [rows, filters],
  );
  const stats = useMemo(() => getCustomerStats(rows), [rows]);

  async function createCustomer(event: React.FormEvent) {
    event.preventDefault();
    const phone = normalizePhoneInput(newCustomer.phone);
    const phoneError = getVietnamPhoneValidationError(phone);

    if (phoneError) {
      setError(phoneError);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload: CustomerInput = {
        name: newCustomer.name.trim(),
        phone,
        email: newCustomer.email.trim() || undefined,
        status: "active",
        tags: splitTags(newCustomer.tagsText),
        internalNotes: newCustomer.internalNotes.trim() || undefined,
        preferredChannel: newCustomer.preferredChannel,
        riskLevel: "green",
        personalization: {},
      };
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Không thể tạo khách hàng");
      }

      setIsCreateOpen(false);
      setNewCustomer(initialNewCustomerForm);
      toast.success("Đã thêm khách hàng mới.");
      router.push(`/admin/customers/${data.id}`);
    } catch (createError) {
      console.error("Failed to create customer:", createError);
      toast.error(
        createError instanceof Error
          ? createError.message
          : "Không thể tạo khách hàng",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Customer CRM
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950">Khách hàng</h1>
          <p className="mt-2 max-w-3xl text-sm text-neutral-600">
            Danh sách để tìm, lọc và mở hồ sơ khách hàng. Các thao tác chăm sóc
            nằm trong trang chi tiết của từng khách.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="h-4 w-4" />
            Thêm khách
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <CustomerStatsCards stats={stats} />
      <CustomerTable
        filters={filters}
        isLoading={isLoading}
        rows={filteredRows}
        onFiltersChange={setFilters}
        onOpenCustomer={(id) => router.push(`/admin/customers/${id}`)}
      />

      {isCreateOpen && (
        <CustomerCreateModal
          form={newCustomer}
          isSaving={isSaving}
          onChange={setNewCustomer}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={createCustomer}
        />
      )}
    </div>
  );
}
