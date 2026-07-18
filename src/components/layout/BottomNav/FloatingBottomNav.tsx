"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Clock3, Home, TicketPercent, UserRound } from "lucide-react";
import { clsx } from "clsx";

export default function FloatingBottomNav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/checkout") || pathname.startsWith("/admin")) {
      return;
    }

    // Check if user is logged in
    fetch("/api/auth/me")
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));
  }, [pathname]);

  if (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/san-pham/") ||
    pathname.startsWith("/wholesale")
  ) {
    return null;
  }

  // Use the same four-item navigation across customer-facing pages.
  return <ProfileBottomNav pathname={pathname} isLoggedIn={isLoggedIn} />;
}

function ProfileBottomNav({
  pathname,
  isLoggedIn,
}: {
  pathname: string;
  isLoggedIn: boolean | null;
}) {
  // Determine rewards href based on login status
  const rewardsHref = isLoggedIn === true ? "/account/rewards" : "/rewards";

  const navItems = [
    {
      label: "Trang chủ",
      href: "/",
      icon: Home,
    },
    {
      label: "Đơn hàng",
      href: "/order",
      icon: Clock3,
    },
    {
      label: "Ưu đãi",
      href: rewardsHref,
      icon: TicketPercent,
    },
    {
      label: "Tài khoản",
      href: "/profile",
      icon: UserRound,
    },
  ];

  const isItemActive = (href: string) =>
    href === "/"
      ? pathname === href
      : pathname.startsWith(href) ||
        (href === rewardsHref &&
          (pathname === "/rewards" || pathname === "/account/rewards"));

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => isItemActive(item.href)),
  );

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-center px-4 pb-4 md:hidden"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <nav className="pointer-events-auto relative isolate grid h-[72px] w-full max-w-[440px] grid-cols-4 items-center overflow-hidden rounded-2xl border border-sand bg-bg-card/95 px-2 shadow-[0_12px_30px_rgba(18,62,102,0.14)] backdrop-blur-md">

        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-2 top-2 z-0 w-[calc((100%_-_1rem)/4)] rounded-xl border border-sand bg-cream shadow-sm transition-transform duration-300 ease-out will-change-transform"
          style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
        >
          <span className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-brand-500" />
        </span>

        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "relative z-10 flex h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-text-muted transition-all duration-200 active:scale-[0.96]",
                isActive && "text-brand-500",
              )}
            >
              <Icon
                className={clsx(
                  "h-6 w-6 transition-transform duration-200",
                  isActive && "-translate-y-0.5 scale-105",
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="w-full truncate px-1 text-center text-[11px] font-bold leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
