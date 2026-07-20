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
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[var(--z-navigation)] flex items-center justify-center px-3 pb-2 md:hidden"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <nav className="pointer-events-auto relative isolate grid h-16 w-full max-w-[440px] grid-cols-4 items-center overflow-hidden rounded-2xl border border-sand bg-bg-card px-1">

        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1 z-0 h-0.5 w-[calc((100%_-_0.5rem)/4)] bg-brand-500 transition-transform duration-200 ease-[var(--ease-out)]"
          style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
        />

        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "relative z-10 flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-text-muted transition-[color,transform] duration-200 ease-[var(--ease-out)] active:translate-y-px",
                isActive && "text-brand-500",
              )}
            >
              <Icon
                className={clsx(
                  "h-5 w-5",
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="w-full truncate px-1 text-center text-[10px] font-bold leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
