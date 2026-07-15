"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Download, Loader2, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Customer } from "@/types";

export default function AccountPreferencesPage() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [preferredChannel, setPreferredChannel] = useState<"phone" | "zalo" | "sms" | "email">("phone");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) { window.location.href = "/account/login?next=/account/preferences"; return; }
      const data = await response.json();
      const next = data.customer as Customer;
      setCustomer(next);
      setOrderNotifications(next.personalization.orderNotifications !== false);
      setMarketingConsent(next.personalization.marketingConsent === true);
      setPreferredChannel(next.preferredChannel ?? "phone");
    });
  }, []);

  async function savePreferences() {
    if (!customer) return;
    setBusy(true); setMessage(null);
    const response = await fetch(`/api/customers/${customer.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customer.name, email: customer.email, preferredChannel,
        personalization: {
          ...customer.personalization, orderNotifications, marketingConsent,
          consentUpdatedAt: new Date().toISOString(),
        },
      }),
    });
    setMessage(response.ok ? "Đã lưu tùy chọn thông báo." : "Chưa thể lưu tùy chọn.");
    setBusy(false);
  }

  async function deleteAccount() {
    if (confirmation !== "XOA TAI KHOAN") return;
    setBusy(true); setMessage(null);
    const response = await fetch("/api/profile/delete", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    });
    const data = await response.json().catch(() => null);
    if (response.ok) { window.location.href = "/"; return; }
    setMessage(data?.requiresReauthentication
      ? "Hãy đăng xuất, đăng nhập lại bằng PIN hoặc passkey rồi thực hiện lại."
      : data?.error || "Chưa thể xóa tài khoản.");
    setBusy(false);
  }

  if (!customer) return <main className="grid min-h-screen place-items-center bg-[#fff8ef]"><Loader2 className="h-6 w-6 animate-spin text-[#b84a39]" /></main>;
  return (
    <main className="min-h-screen bg-[#fff8ef] pb-24 text-[#3b170c]">
      <div className="mx-auto w-full max-w-[480px] px-4 py-5">
        <header className="flex items-center gap-3"><Link href="/account" className="grid h-10 w-10 place-items-center rounded-full bg-white shadow-sm" aria-label="Quay lại"><ArrowLeft className="h-5 w-5" /></Link><div><h1 className="text-xl font-black">Thông báo & quyền riêng tư</h1><p className="text-xs font-semibold text-[#8b6a58]">Kiểm soát cách tiệm sử dụng dữ liệu của bạn.</p></div></header>

        <section className="mt-5 rounded-[18px] bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-black"><Bell className="h-5 w-5" /> Thông báo</h2>
          <Toggle label="Cập nhật trạng thái đơn hàng" checked={orderNotifications} onChange={setOrderNotifications} />
          <Toggle label="Ưu đãi và gợi ý cá nhân hóa" checked={marketingConsent} onChange={setMarketingConsent} />
          <label className="mt-4 block text-xs font-black text-[#7b4b34]">Kênh liên hệ ưu tiên<select value={preferredChannel} onChange={(event) => setPreferredChannel(event.target.value as typeof preferredChannel)} className="mt-1 h-11 w-full rounded-xl border border-[#edd8ca] bg-[#fffaf6] px-3 text-sm"><option value="phone">Điện thoại</option><option value="zalo">Zalo</option><option value="sms">SMS</option><option value="email">Email</option></select></label>
          <button type="button" onClick={savePreferences} disabled={busy} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#b84a39] text-sm font-black text-white disabled:opacity-60"><Save className="h-4 w-4" /> Lưu tùy chọn</button>
        </section>

        <section className="mt-4 rounded-[18px] bg-white p-4 shadow-sm">
          <h2 className="text-base font-black">Dữ liệu cá nhân</h2>
          <a href="/api/profile/export" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#edd8ca] text-sm font-black text-[#7a4b31]"><Download className="h-4 w-4" /> Tải dữ liệu của tôi</a>
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-red-800"><ShieldAlert className="h-4 w-4" /> Xóa tài khoản</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-red-700">Dữ liệu hồ sơ, passkey và phiên đăng nhập sẽ bị xóa. Thông tin cá nhân trên đơn cũ sẽ được ẩn danh.</p>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Nhập XOA TAI KHOAN" className="mt-3 h-11 w-full rounded-xl border border-red-200 bg-white px-3 text-sm font-bold" />
            <button type="button" onClick={deleteAccount} disabled={busy || confirmation !== "XOA TAI KHOAN"} className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-700 text-sm font-black text-white disabled:opacity-40"><Trash2 className="h-4 w-4" /> Xóa vĩnh viễn</button>
          </div>
        </section>
        {message && <p role="status" className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-[#7a4b31]">{message}</p>}
      </div>
    </main>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="mt-4 flex items-center justify-between gap-3 text-sm font-bold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#b84a39]" /></label>;
}
