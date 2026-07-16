"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AdminSidebar } from "@/features/admin/components/AdminSidebar";
import { canAdminAccessPath, getAdminHomeForRole, type AdminPrincipal } from "@/lib/auth/admin-rbac";

export function AdminFrame({ children, admin }: { children: React.ReactNode; admin: AdminPrincipal }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPosRoute = pathname === "/admin/pos" || pathname.startsWith("/admin/pos/");
  const canAccess = canAdminAccessPath(admin.role, pathname);

  useEffect(() => {
    if (!canAccess) router.replace(getAdminHomeForRole(admin.role));
  }, [admin.role, canAccess, router]);

  if (!canAccess) return null;

  return (
    <div
      className={clsx(
        "flex h-screen overflow-hidden",
        isPosRoute ? "bg-[#f3f5f4]" : "admin-ui-frame bg-[#f3f5f4]",
      )}
    >
      <AdminSidebar admin={admin} />
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
