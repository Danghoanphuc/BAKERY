"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { AdminSidebar } from "@/features/wholesale-admin/components/AdminSidebar";
import { AdminToaster } from "@/features/wholesale-admin/components/AdminToast";
import { canAdminAccessPath, getAdminHomeForRole, type AdminPrincipal } from "@/lib/auth/admin-rbac";

export function AdminFrame({ children, admin }: { children: React.ReactNode; admin: AdminPrincipal }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPosRoute = pathname === "/wholesale/pos" || pathname.startsWith("/wholesale/pos/");
  const isTableServiceRoute = pathname === "/wholesale/pos/tables" || pathname.startsWith("/wholesale/pos/tables/");
  const isGrowthStudioRoute = pathname === "/wholesale/growth-studio" || pathname.startsWith("/wholesale/growth-studio/");
  const canAccess = canAdminAccessPath(admin.role, pathname);

  useEffect(() => {
    if (!canAccess) {
      router.replace(getAdminHomeForRole(admin.role).replace(/^\/admin/, "/wholesale"));
    }
  }, [admin.role, canAccess, router]);

  if (!canAccess) return null;

  return (
    <div
      className={clsx(
        "flex h-screen overflow-hidden",
        isPosRoute ? "bg-bg-main" : "admin-ui-frame bg-bg-main",
      )}
    >
      <AdminToaster />
      <div className={isTableServiceRoute ? "hidden sm:block" : undefined}>
        <AdminSidebar admin={admin} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main
          className={clsx(
            "flex-1 overflow-y-auto",
            isTableServiceRoute
              ? "p-0 sm:p-6"
              : isGrowthStudioRoute
                ? "p-0"
              : isPosRoute
                ? "p-6"
                : "px-5 py-5 lg:px-7 lg:py-6",
          )}
        >
          <div
            className={
              isTableServiceRoute
                ? "h-full"
                : isGrowthStudioRoute
                  ? "h-full"
                : isPosRoute
                  ? "mx-auto max-w-7xl"
                  : "mx-auto max-w-[1440px]"
            }
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
