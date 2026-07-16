"use client";

import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";

export function AdminFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPosRoute = pathname === "/admin/pos" || pathname.startsWith("/admin/pos/");

  return (
    <div
      className={clsx(
        "flex h-screen overflow-hidden",
        isPosRoute ? "bg-[#f3f5f4]" : "admin-ui-frame bg-[#f3f5f4]",
      )}
    >
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main
          className={clsx(
            "flex-1 overflow-y-auto",
            isPosRoute ? "p-6" : "px-5 py-5 lg:px-7 lg:py-6",
          )}
        >
          <div className={isPosRoute ? "mx-auto max-w-7xl" : "mx-auto max-w-[1440px]"}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
