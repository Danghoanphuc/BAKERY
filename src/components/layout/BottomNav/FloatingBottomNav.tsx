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
    // Check if user is logged in
    fetch("/api/auth/me")
      .then((res) => setIsLoggedIn(res.ok))
      .catch(() => setIsLoggedIn(false));
  }, []);

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
      <nav className="pointer-events-auto relative isolate grid h-[72px] w-full max-w-[440px] grid-cols-4 items-center overflow-hidden rounded-[26px] border border-white/80 bg-white/[0.22] px-2 shadow-[0_18px_44px_rgba(61,36,23,0.18),0_2px_8px_rgba(61,36,23,0.08),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(255,255,255,0.38)] backdrop-blur-[30px] backdrop-brightness-[1.08] backdrop-contrast-[1.08] backdrop-saturate-[1.85]">
        <span className="pointer-events-none absolute inset-[1px] -z-10 rounded-[24px] bg-[linear-gradient(155deg,rgba(255,255,255,0.58)_0%,rgba(255,255,255,0.16)_38%,rgba(255,255,255,0.06)_62%,rgba(184,74,57,0.12)_100%)]" />
        <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-100" />
        <span className="pointer-events-none absolute -left-10 -top-14 h-24 w-64 rotate-[-7deg] rounded-full bg-white/65 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-14 right-0 h-24 w-52 rounded-full bg-[#b84a39]/10 blur-2xl" />

        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-2 left-2 top-2 z-0 w-[calc((100%_-_1rem)/4)] rounded-[18px] border border-white/75 bg-white/[0.44] shadow-[0_8px_20px_rgba(83,38,12,0.12),inset_0_1px_0_rgba(255,255,255,1),inset_0_-1px_0_rgba(255,255,255,0.3)] transition-transform duration-500 ease-[cubic-bezier(0.22,1.35,0.36,1)] will-change-transform"
          style={{ transform: `translate3d(${activeIndex * 100}%, 0, 0)` }}
        >
          <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
          <span className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_28%_10%,rgba(255,255,255,0.75),transparent_42%),linear-gradient(145deg,rgba(255,255,255,0.24),rgba(184,74,57,0.05))]" />
        </span>

        {navItems.map((item, index) => {
          const isActive = index === activeIndex;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "relative z-10 flex h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-[17px] text-[#4f4844] transition-all duration-200 active:scale-[0.96]",
                isActive && "text-[#a63f30]",
              )}
            >
              <Icon
                className={clsx(
                  "h-[25px] w-[25px] drop-shadow-[0_1px_0_rgba(255,255,255,0.95)] transition-transform duration-300",
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
