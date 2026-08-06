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
  const isRouteExecution =
    pathname === "/wholesale/routes/today" ||
    pathname.startsWith("/wholesale/routes/today/");
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
      <div
        className={
          isTableServiceRoute
            ? "hidden sm:block"
            : isRouteExecution
              ? "hidden lg:block"
              : undefined
        }
      >
        <AdminSidebar admin={admin} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <main
          className={clsx(
            "flex-1 overflow-x-clip overflow-y-auto",
            isTableServiceRoute || isRouteExecution
              ? "p-0 sm:p-6"
              : isGrowthStudioRoute
                ? "p-0"
              : isPosRoute
                ? "p-6"
                : "px-4 pb-24 pt-4 md:px-5 md:pb-5 md:pt-5 lg:px-7 lg:pb-6 lg:pt-6",
          )}
        >
          <div
            className={
              isTableServiceRoute || isRouteExecution
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
