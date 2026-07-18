"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("Mật khẩu quản trị không đúng.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="brand-page grid min-h-screen place-items-center p-4 md:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-sand bg-bg-card shadow-[0_24px_70px_oklch(27%_0.045_48/0.12)] md:grid-cols-[1.05fr_0.95fr]">
      <aside className="hidden min-h-[34rem] flex-col justify-between bg-navy p-10 text-white md:flex">
        <div>
          <p className="font-display text-2xl font-semibold tracking-[-0.04em]">SweetTime</p>
          <p className="mt-2 text-xs font-extrabold uppercase tracking-[0.12em] text-white/55">Bakery operations</p>
        </div>
        <div>
          <p className="font-display text-5xl font-semibold leading-[1.05] tracking-[-0.05em]">
            Mọi mẻ bánh bắt đầu từ một ca vận hành tốt.
          </p>
          <p className="mt-5 max-w-sm text-sm font-medium leading-6 text-white/65">
            Theo dõi đơn hàng, sản phẩm và tài chính trong cùng một không gian làm việc.
          </p>
        </div>
      </aside>
      <form onSubmit={submit} className="flex min-h-[34rem] w-full flex-col justify-center p-6 md:p-10">
        <p className="brand-eyebrow">Khu vực nội bộ</p>
        <h1 className="brand-heading mt-3 text-3xl">Đăng nhập quản trị</h1>
        <p className="mt-1 text-sm text-neutral-500">Khu vực vận hành và tài chính Bakery.</p>
        <label className="mt-5 block text-sm font-semibold text-neutral-700">
          Mật khẩu
          <input type="password" required value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-sand bg-bg-main px-3 outline-none transition focus:border-brand-500 focus:ring-3 focus:ring-brand-100" />
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="brand-button-primary mt-5 w-full disabled:opacity-60">
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
      </div>
    </main>
  );
}
