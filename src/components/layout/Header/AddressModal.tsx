"use client";

import React, { useState } from "react";
import { clsx } from "clsx";
import { Modal } from "@/components/common/Modal";
import { useOrderConfigStore } from "@/store/orderConfigStore";

export interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { config, setDeliveryAddress } = useOrderConfigStore();
  const [street, setStreet] = useState(config.deliveryAddress?.street || "");
  const [district, setDistrict] = useState(
    config.deliveryAddress?.district || "",
  );
  const [city, setCity] = useState(config.deliveryAddress?.city || "Hà Nội");

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStreet(config.deliveryAddress?.street || "");
      setDistrict(config.deliveryAddress?.district || "");
      setCity(config.deliveryAddress?.city || "Hà Nội");
    }
  }, [isOpen, config.deliveryAddress]);

  // Common districts in Hanoi for quick selection
  const commonDistricts = [
    "Ba Đình",
    "Hoàn Kiếm",
    "Tây Hồ",
    "Long Biên",
    "Cầu Giấy",
    "Đống Đa",
    "Hai Bà Trưng",
    "Hoàng Mai",
    "Thanh Xuân",
    "Nam Từ Liêm",
    "Bắc Từ Liêm",
    "Hà Đông",
  ];

  const handleConfirm = () => {
    // Validate required fields
    if (!street.trim() || !district.trim() || !city.trim()) {
      // Show validation error
      return;
    }

    const newAddress = {
      street: street.trim(),
      district: district.trim(),
      city: city.trim(),
    };

    setDeliveryAddress(newAddress);
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    setStreet(config.deliveryAddress?.street || "");
    setDistrict(config.deliveryAddress?.district || "");
    setCity(config.deliveryAddress?.city || "Hà Nội");
    onClose();
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    setDistrict(selectedDistrict);
  };

  const isFormValid = street.trim() && district.trim() && city.trim();

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Địa chỉ giao hàng">
      <div className="space-y-6">
        {/* Current Address Display */}
        {config.deliveryAddress && (
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
            <h3 className="font-medium text-primary-900 mb-2">
              Địa chỉ hiện tại
            </h3>
            <p className="text-primary-700 text-sm">
              {config.deliveryAddress.street}, {config.deliveryAddress.district}
              , {config.deliveryAddress.city}
            </p>
          </div>
        )}

        {/* Address Form */}
        <div className="space-y-4">
          {/* Street Address */}
          <div className="space-y-2">
            <label
              htmlFor="street-address"
              className="block text-sm font-medium text-neutral-700"
            >
              Địa chỉ cụ thể <span className="text-red-500">*</span>
            </label>
            <input
              id="street-address"
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="Số nhà, tên đường..."
              className={clsx(
                "w-full px-3 py-3 border border-neutral-300 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                "text-base", // Prevent zoom on iOS
                !street.trim() && "border-red-300",
              )}
              required
            />
          </div>

          {/* District Selection */}
          <div className="space-y-2">
            <label
              htmlFor="district-input"
              className="block text-sm font-medium text-neutral-700"
            >
              Quận/Huyện <span className="text-red-500">*</span>
            </label>

            {/* District Input */}
            <input
              id="district-input"
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="Chọn hoặc nhập quận/huyện"
              className={clsx(
                "w-full px-3 py-3 border border-neutral-300 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                "text-base", // Prevent zoom on iOS
                !district.trim() && "border-red-300",
              )}
              required
            />

            {/* Quick District Selection */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {commonDistricts.map((districtName) => (
                <button
                  key={districtName}
                  type="button"
                  onClick={() => handleDistrictSelect(districtName)}
                  className={clsx(
                    "px-3 py-2 text-sm rounded-lg border transition-colors text-left",
                    district === districtName
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-neutral-300 text-neutral-700 hover:border-primary-300 hover:bg-primary-50",
                  )}
                >
                  {districtName}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div className="space-y-2">
            <label
              htmlFor="city-select"
              className="block text-sm font-medium text-neutral-700"
            >
              Thành phố <span className="text-red-500">*</span>
            </label>
            <select
              id="city-select"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={clsx(
                "w-full px-3 py-3 border border-neutral-300 rounded-lg",
                "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                "text-base", // Prevent zoom on iOS
                !city.trim() && "border-red-300",
              )}
              required
            >
              <option value="Hà Nội">Hà Nội</option>
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
              <option value="Hải Phòng">Hải Phòng</option>
              <option value="Cần Thơ">Cần Thơ</option>
            </select>
          </div>
        </div>

        {/* Delivery Note */}
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start space-x-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
            >
              <path
                d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M10 7V13M10 16H10.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                Lưu ý giao hàng
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Vui lòng cung cấp địa chỉ chính xác để đảm bảo giao hàng nhanh
                chóng. Phí giao hàng sẽ được tính dựa trên khoảng cách.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleCancel}
            className={clsx(
              "flex-1 px-6 py-3 border-2 border-neutral-300 rounded-lg",
              "font-medium text-neutral-700",
              "hover:bg-neutral-50 active:bg-neutral-100",
              "transition-colors min-h-[48px]",
            )}
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isFormValid}
            className={clsx(
              "flex-1 px-6 py-3 rounded-lg font-medium min-h-[48px]",
              "transition-colors",
              !isFormValid
                ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                : "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700",
            )}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </Modal>
  );
};
