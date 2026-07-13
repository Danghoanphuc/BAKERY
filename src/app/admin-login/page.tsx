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
    <main className="grid min-h-screen place-items-center bg-neutral-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-neutral-950">Đăng nhập quản trị</h1>
        <p className="mt-1 text-sm text-neutral-500">Khu vực vận hành và tài chính Bakery.</p>
        <label className="mt-5 block text-sm font-semibold text-neutral-700">
          Mật khẩu
          <input type="password" required value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-lg border border-neutral-300 px-3 outline-none focus:border-brand-500" />
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="mt-5 h-11 w-full rounded-lg bg-brand-500 font-semibold text-white disabled:opacity-60">
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}

