"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Save, ShieldCheck } from "lucide-react";
import type { Customer } from "@/types";

type AccountForm = {
  name: string;
  email: string;
  birthday: string;
  defaultDeliveryAddress: string;
  favoriteFlavors: string;
  favoriteProducts: string;
  dietaryNotes: string;
  specialOccasions: string;
  notes: string;
};

function toForm(customer: Customer): AccountForm {
  return {
    name: customer.name,
    email: customer.email ?? "",
    birthday: customer.personalization.birthday ?? "",
    defaultDeliveryAddress:
      customer.personalization.defaultDeliveryAddress ?? "",
    favoriteFlavors: (customer.personalization.favoriteFlavors ?? []).join(", "),
    favoriteProducts: (customer.personalization.favoriteProducts ?? []).join(
      ", ",
    ),
    dietaryNotes: customer.personalization.dietaryNotes ?? "",
    specialOccasions: customer.personalization.specialOccasions ?? "",
    notes: customer.personalization.notes ?? "",
  };
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function AccountPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<AccountForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAccount() {
      try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
          window.location.href = "/account/login?next=/account";
          return;
        }

        const data = await response.json();
        setCustomer(data.customer);
        setForm(toForm(data.customer));
      } finally {
        setIsLoading(false);
      }
    }

    loadAccount();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || !form) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email || undefined,
          personalization: {
            birthday: form.birthday || undefined,
            defaultDeliveryAddress:
              form.defaultDeliveryAddress || undefined,
            favoriteFlavors: splitTags(form.favoriteFlavors),
            favoriteProducts: splitTags(form.favoriteProducts),
            dietaryNotes: form.dietaryNotes || undefined,
            specialOccasions: form.specialOccasions || undefined,
            notes: form.notes || undefined,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("save_failed");
      }

      const updatedCustomer: Customer = {
        ...customer,
        name: form.name,
        email: form.email || undefined,
        personalization: {
          birthday: form.birthday || undefined,
          defaultDeliveryAddress:
            form.defaultDeliveryAddress || undefined,
          favoriteFlavors: splitTags(form.favoriteFlavors),
          favoriteProducts: splitTags(form.favoriteProducts),
          dietaryNotes: form.dietaryNotes || undefined,
          specialOccasions: form.specialOccasions || undefined,
          notes: form.notes || undefined,
        },
      };

      setCustomer(updatedCustomer);
      setForm(toForm(updatedCustomer));
      setMessage("Đã cập nhật hồ sơ của bạn.");
    } catch (err) {
      console.error("Failed to update account:", err);
      setError("Chưa lưu được hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !form || !customer) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef] px-4 text-[#7a4b31]">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang mở tài khoản...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fff8ef] pb-28 text-[#3b170c]">
      <div className="mx-auto w-full max-w-[480px] px-4 py-5">
        <div className="flex items-center justify-between">
          <Link
            href="/profile"
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#7a4b31] shadow-sm"
            aria-label="Quay lại hồ sơ"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-right">
            <h1 className="text-[22px] font-black">Tài khoản</h1>
            <p className="text-[12px] font-semibold text-[#8b6a58]">
              {customer.zaloUserId ? "Đã liên kết Zalo" : "Chưa liên kết Zalo"}
            </p>
          </div>
        </div>

        <section className="mt-5 rounded-[18px] border border-white bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#8a4a28] text-lg font-black uppercase text-white">
              {customer.name
                .trim()
                .split(/\s+/)
                .slice(-2)
                .map((part) => part[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[17px] font-black">
                {customer.name}
              </p>
              <p className="text-[13px] font-semibold text-[#7b6a60]">
                {customer.phone}
              </p>
            </div>
            <ShieldCheck
              className={`h-6 w-6 ${
                customer.zaloUserId ? "text-[#34802f]" : "text-[#b69a89]"
              }`}
            />
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <section className="rounded-[18px] bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
            <h2 className="text-[16px] font-black">Thông tin cơ bản</h2>
            <div className="mt-3 space-y-3">
              <Field
                label="Tên khách hàng"
                value={form.name}
                onChange={(value) => setForm({ ...form, name: value })}
                required
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(value) => setForm({ ...form, email: value })}
              />
              <Field
                label="Ngày sinh"
                type="date"
                value={form.birthday}
                onChange={(value) => setForm({ ...form, birthday: value })}
              />
            </div>
          </section>

          <section className="rounded-[18px] bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
            <h2 className="text-[16px] font-black">Sổ địa chỉ</h2>
            <div className="mt-3">
              <TextArea
                label="Địa chỉ nhận bánh mặc định"
                value={form.defaultDeliveryAddress}
                onChange={(value) =>
                  setForm({ ...form, defaultDeliveryAddress: value })
                }
              />
            </div>
          </section>

          <section className="rounded-[18px] bg-white/82 p-4 shadow-[0_10px_24px_rgba(83,38,12,0.08)]">
            <h2 className="text-[16px] font-black">Cá nhân hóa</h2>
            <div className="mt-3 space-y-3">
              <Field
                label="Vị bánh yêu thích"
                value={form.favoriteFlavors}
                onChange={(value) =>
                  setForm({ ...form, favoriteFlavors: value })
                }
                placeholder="Ví dụ: chocolate, matcha, dâu"
              />
              <Field
                label="Món thường mua"
                value={form.favoriteProducts}
                onChange={(value) =>
                  setForm({ ...form, favoriteProducts: value })
                }
                placeholder="Ví dụ: tiramisu, croissant"
              />
              <TextArea
                label="Ghi chú ăn uống"
                value={form.dietaryNotes}
                onChange={(value) =>
                  setForm({ ...form, dietaryNotes: value })
                }
              />
              <TextArea
                label="Dịp đặc biệt"
                value={form.specialOccasions}
                onChange={(value) =>
                  setForm({ ...form, specialOccasions: value })
                }
              />
              <TextArea
                label="Ghi chú khác"
                value={form.notes}
                onChange={(value) => setForm({ ...form, notes: value })}
              />
            </div>
          </section>

          {message && (
            <p className="rounded-[12px] bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-[12px] bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#d85d6c] text-[15px] font-black text-white shadow-[0_8px_16px_rgba(216,93,108,0.22)] disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Lưu hồ sơ
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-black text-[#7b4b34]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-[12px] border border-[#edd8ca] bg-[#fffaf6] px-3 text-[14px] font-semibold outline-none focus:border-[#d85d6c]"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-black text-[#7b4b34]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="mt-1 w-full resize-none rounded-[12px] border border-[#edd8ca] bg-[#fffaf6] px-3 py-2 text-[14px] font-semibold outline-none focus:border-[#d85d6c]"
      />
    </label>
  );
}
