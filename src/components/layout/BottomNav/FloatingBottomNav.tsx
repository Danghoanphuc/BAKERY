"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CakeSlice, Clock3, Gift, Home, UserRound } from "lucide-react";
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

  // Use the profile nav with 5 items (including featured "Đặt bánh") for ALL pages
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
      label: "Đặt bánh",
      href: "/cart",
      icon: CakeSlice,
      featured: true,
    },
    {
      label: "Ưu đãi",
      href: rewardsHref,
      icon: Gift,
    },
    {
      label: "Tài khoản",
      href: "/profile",
      icon: UserRound,
    },
  ];

  return (
    <div
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-center px-4 pb-4 md:hidden"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      <nav className="pointer-events-auto grid h-[72px] w-full max-w-[440px] grid-cols-5 items-center rounded-[24px] border border-[#efe0d4] bg-white/82 px-2 shadow-[0_12px_30px_rgba(83,38,12,0.14)] backdrop-blur-xl">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname.startsWith(item.href) ||
                // Also mark rewards as active on /account/rewards
                (item.href === rewardsHref &&
                  (pathname === "/rewards" || pathname === "/account/rewards"));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "relative flex h-[62px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] text-[#6b625d] transition active:scale-[0.98]",
                isActive && "text-[#d85d6c]",
              )}
            >
              {item.featured ? (
                <span className="absolute -top-8 grid h-[66px] w-[66px] place-items-center rounded-full border-[5px] border-white bg-[#d85d6c] text-white shadow-[0_8px_18px_rgba(216,93,108,0.35)]">
                  <Icon className="h-8 w-8" />
                </span>
              ) : (
                <Icon className="h-7 w-7" strokeWidth={isActive ? 2.5 : 2} />
              )}
              <span
                className={clsx(
                  "w-full truncate px-1 text-center text-[12px] font-semibold leading-none",
                  item.featured && "mt-8 text-[#d85d6c]",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
