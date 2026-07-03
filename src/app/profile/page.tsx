"use client";

import { useEffect, useState } from "react";
import { ProfileExperience } from "@/features/profile";
import type { Customer } from "@/types";

type ProfilePageData = {
  customer: Customer;
  rewards: {
    points: {
      current: number;
      neededForNextTier: number;
      progressPercent: number;
    };
    journey: {
      currentTier: {
        id: string;
        name: string;
        threshold: number;
        icon: string;
        benefit: string;
      };
      nextTier: {
        id: string;
        name: string;
        threshold: number;
        icon: string;
        benefit: string;
      } | null;
    };
    totals: {
      orderCount: number;
      lifetimeValue: number;
      favoriteProduct: string;
      favoriteQuantity: number;
    };
  };
  profile: {
    hasBirthday: boolean;
    hasDeliveryAddress: boolean;
    isZaloLinked: boolean;
    unlockedVoucherCount: number;
  };
};

export default function ProfilePage() {
  const [data, setData] = useState<ProfilePageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");

        if (!response.ok) {
          window.location.href = "/account/login?next=/profile";
          return;
        }

        setData(await response.json());
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8ef] px-4 text-[#7a4b31]">
        <p className="text-[16px] font-semibold">
          Đang mở hồ sơ khách hàng...
        </p>
      </main>
    );
  }

  if (!data) return null;

  return <ProfileExperience data={data} />;
}
