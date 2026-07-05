"use client";

import { FormEvent, useState } from "react";
import { ScanLine, TicketPercent } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type RedeemResult = {
  voucher: { title: string; code: string };
  customer: { name: string; phone: string };
  pricing: {
    subtotal: number;
    discountAmount: number;
    totalAfterDiscount: number;
  };
};

export default function AdminVoucherScanPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/vouchers/pos-redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          phone,
          name,
          subtotal: Number(subtotal),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Không thể áp voucher.");
        return;
      }

      setResult(data);
    } catch (err) {
      console.error("Redeem voucher failed:", err);
      setError("Không thể áp voucher.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-neutral-950">
          Quét voucher tại quầy
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-600">
          Nhân viên scan QR/barcode từ điện thoại khách, nhập số điện thoại và
          tạm tính để màn hình phụ hiển thị giá trước/sau voucher.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5 lg:grid-cols-4"
      >
        <Field label="Mã voucher" value={code} onChange={setCode} required />
        <Field
          label="Số điện thoại"
          value={phone}
          onChange={setPhone}
          required
        />
        <Field label="Tên khách" value={name} onChange={setName} />
        <Field
          label="Tạm tính"
          type="number"
          value={subtotal}
          onChange={setSubtotal}
          required
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60 lg:col-span-4"
        >
          <ScanLine className="h-4 w-4" />
          {isSubmitting ? "Đang áp voucher..." : "Áp voucher"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {result && (
        <section className="rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
              <TicketPercent className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-neutral-950">
                {result.voucher.title}
              </h2>
              <p className="text-sm text-neutral-600">
                {result.customer.name} - {result.customer.phone}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <PriceCard label="Giá ban đầu" value={result.pricing.subtotal} />
            <PriceCard
              label="Voucher giảm"
              value={result.pricing.discountAmount}
              tone="discount"
            />
            <PriceCard
              label="Khách thanh toán"
              value={result.pricing.totalAfterDiscount}
              tone="final"
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function PriceCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "discount" | "final";
}) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-semibold text-neutral-600">{label}</p>
      <p
        className={`mt-2 text-2xl font-black ${
          tone === "discount"
            ? "text-emerald-600"
            : tone === "final"
              ? "text-brand-600"
              : "text-neutral-950"
        }`}
      >
        {tone === "discount" ? "-" : ""}
        {formatPrice(value)}
      </p>
    </div>
  );
}
