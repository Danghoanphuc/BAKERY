"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw } from "lucide-react";
import type { Dealer } from "@/types";
import {
  DealerStatsCards,
  DealerTable,
  DealerCreateModal,
  type NewDealerForm,
} from "@/features/admin/wholesale/dealers";

const initialNewDealerForm: NewDealerForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  district: "",
  city: "",
  type: "",
  businessLicense: "",
  taxId: "",
  contactPerson: "",
  contactPhone: "",
  notes: "",
  creditLimit: "5000000",
  paymentTerms: "cod",
};

export default function DealersPage() {
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newDealer, setNewDealer] =
    useState<NewDealerForm>(initialNewDealerForm);

  async function loadDealers() {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/wholesale/dealers", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Không thể tải danh sách đại lý");
      }

      setDealers((await response.json()) as Dealer[]);
      setError(null);
    } catch (loadError) {
      console.error("Failed to load dealers:", loadError);
      setError("Không thể tải dữ liệu đại lý.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDealers();
  }, []);

  const stats = useMemo(() => {
    return {
      total: dealers.length,
      pending: dealers.filter((d) => d.status === "pending").length,
      approved: dealers.filter((d) => d.status === "approved").length,
      suspended: dealers.filter((d) => d.status === "suspended").length,
    };
  }, [dealers]);

  async function createDealer(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: newDealer.name.trim(),
        phone: newDealer.phone.trim(),
        email: newDealer.email.trim() || undefined,
        address: newDealer.address.trim(),
        district: newDealer.district.trim(),
        city: newDealer.city.trim(),
        type: newDealer.type,
        businessLicense: newDealer.businessLicense.trim() || undefined,
        taxId: newDealer.taxId.trim() || undefined,
        contactPerson: newDealer.contactPerson.trim() || undefined,
        contactPhone: newDealer.contactPhone.trim() || undefined,
        notes: newDealer.notes.trim() || undefined,
        creditLimit: newDealer.creditLimit ? parseInt(newDealer.creditLimit, 10) : undefined,
        paymentTerms: newDealer.paymentTerms as "cod" | "net_7" | "next_order",
      };

      const response = await fetch("/api/admin/wholesale/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Không thể tạo đại lý");
      }

      setIsCreateOpen(false);
      setNewDealer(initialNewDealerForm);
      loadDealers();
    } catch (createError) {
      console.error("Failed to create dealer:", createError);
      setError(
        createError instanceof Error
          ? createError.message
          : "Không thể tạo đại lý",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#b84a39]">
            Wholesale CRM
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#3d2417]">Quản lý đại lý</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#7b6254]">
            Danh sách đại lý, phê duyệt đăng ký và quản lý thông tin
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadDealers}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#b84a39] px-4 text-sm font-semibold text-white hover:bg-[#c94c5c]"
          >
            <Plus className="h-4 w-4" />
            Thêm đại lý
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DealerStatsCards stats={stats} />
      <DealerTable
        dealers={dealers}
        isLoading={isLoading}
        onOpenDealer={(id) => router.push(`/wholesale/dealers/${id}`)}
      />

      {isCreateOpen && (
        <DealerCreateModal
          form={newDealer}
          isSaving={isSaving}
          onChange={setNewDealer}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={createDealer}
        />
      )}
    </div>
  );
}
