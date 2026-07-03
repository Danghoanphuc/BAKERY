"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import { clsx } from "clsx";
import { ChevronDown, Clock, MapPin, UserRound } from "lucide-react";
import { useOrderConfigStore } from "@/store/orderConfigStore";
import { OrderTimingModal } from "./OrderTimingModal";
import { AddressModal } from "./AddressModal";

export interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const pathname = usePathname();
  const { config, setDeliveryAddress } = useOrderConfigStore();
  const [isTimingModalOpen, setIsTimingModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    if (pathname === "/") return;
    if (config.deliveryAddress) return;

    if (!navigator.geolocation) {
      console.warn("Geolocation không được hỗ trợ trên trình duyệt này");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
              headers: {
                "User-Agent": "BakeryApp/1.0",
              },
            },
          );

          if (!response.ok) {
            throw new Error("Không thể lấy thông tin địa chỉ");
          }

          const data = await response.json();
          const address = data.address || {};
          const street =
            address.road ||
            address.street ||
            address.hamlet ||
            "Đường chưa xác định";
          const district =
            address.suburb ||
            address.quarter ||
            address.neighbourhood ||
            address.city_district ||
            "Quận/Huyện chưa xác định";
          const city =
            address.city ||
            address.town ||
            address.village ||
            address.state ||
            "TP. Hồ Chí Minh";

          setDeliveryAddress({
            street,
            district,
            city,
          });

          setIsLocating(false);
        } catch (error) {
          console.error("Lỗi khi reverse geocoding:", error);
          setIsLocating(false);
        }
      },
      (error) => {
        console.warn("Không thể lấy vị trí:", error.message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [config.deliveryAddress, pathname, setDeliveryAddress]);

  const getTimingText = () => {
    if (config.orderTiming.type === "now") {
      return "Giao ngay";
    }
    return "Đặt trước";
  };

  const getAddressText = () => {
    if (isLocating) return "Đang tìm vị trí...";
    if (!config.deliveryAddress) return "Nhấn để chọn địa chỉ";
    const { street, district } = config.deliveryAddress;
    return `${street}, ${district}`;
  };

  // Hide header on all main pages except admin
  if (!pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      <header
        className={clsx(
          "fixed top-0 left-0 right-0 z-40 bg-[#00B14F] text-white",
          "h-16 flex items-center px-4 pt-safe-area-inset-top",
          "transition-all duration-200 shadow-sm",
          className,
        )}
      >
        <div className="flex-1 flex items-center justify-between gap-2 max-w-7xl mx-auto">
          <button
            type="button"
            onClick={() => setIsTimingModalOpen(true)}
            className="flex items-center gap-2 flex-1 min-w-0 group py-2 px-3 -ml-3 rounded-lg hover:bg-black/10 active:bg-black/20 transition-colors"
            aria-label="Chọn thời gian đặt hàng"
          >
            <Clock className="w-5 h-5 flex-shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">
                {getTimingText()}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-y-0.5" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsAddressModalOpen(true)}
            className="flex items-center gap-2 flex-1 min-w-0 group py-2 px-3 rounded-lg hover:bg-black/10 active:bg-black/20 transition-colors"
            aria-label="Chọn địa chỉ giao hàng"
          >
            <MapPin
              className={clsx(
                "w-5 h-5 flex-shrink-0",
                isLocating && "animate-pulse",
              )}
            />
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-sm font-semibold truncate">
                {getAddressText()}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform group-hover:translate-y-0.5" />
            </div>
          </button>

          <Link
            href="/profile"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg hover:bg-black/10 active:bg-black/20 transition-colors"
            aria-label="Tài khoản khách hàng"
          >
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <OrderTimingModal
        isOpen={isTimingModalOpen}
        onClose={() => setIsTimingModalOpen(false)}
      />
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </>
  );
};
