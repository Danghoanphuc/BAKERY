"use client";

import { useState, useEffect, useRef } from "react";
import { sanitizePin } from "@/features/auth/pin-ui";

type PinSetupFlowProps = {
  onComplete: (pin: string) => void;
  isLoading?: boolean;
};

export default function PinSetupFlow({
  onComplete,
  isLoading,
}: PinSetupFlowProps) {
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [firstPin, setFirstPin] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [isError, setIsError] = useState(false);

  // Trạng thái để biết input có đang được focus hay không (để hiện con trỏ nhấp nháy)
  const [isFocused, setIsFocused] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const keepPinVisible = () => {
    [80, 260].forEach((delay) => {
      window.setTimeout(() => {
        inputRef.current?.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
      }, delay);
    });
  };

  useEffect(() => {
    if (currentValue.length === 4) {
      if (step === "create") {
        setFirstPin(currentValue);
        setCurrentValue("");
        setStep("confirm");
      } else if (step === "confirm") {
        if (currentValue === firstPin) {
          onComplete(currentValue);
        } else {
          setIsError(true);
          setCurrentValue("");
          setTimeout(() => {
            setIsError(false);
            inputRef.current?.focus();
          }, 400);
        }
      }
    }
  }, [currentValue, step, firstPin, onComplete]);

  // Render 4 ô UI giả
  const renderFakeBoxes = () => {
    return Array.from({ length: 4 }).map((_, index) => {
      const char = currentValue[index];
      // Ô đang chờ nhập là ô có index bằng với độ dài chuỗi hiện tại
      const isActive = isFocused && index === currentValue.length;

      return (
        <div
          key={index}
          className={`relative flex h-14 w-12 items-center justify-center rounded-xl border-2 bg-[#fffaf6] text-[24px] transition-all
            ${
              isError
                ? "border-red-500 bg-red-50 text-red-600"
                : isActive
                  ? "border-[#b84a39] shadow-[0_0_0_3px_rgba(184,74,57,0.15)]"
                  : "border-[#eadbcc] text-[#3d2417]"
            }
          `}
        >
          {/* Nếu có ký tự, hiển thị dấu chấm tròn lớn */}
          {char ? (
            <span className="h-3.5 w-3.5 rounded-full bg-current"></span>
          ) : (
            /* Nếu chưa có ký tự và đang Active, hiển thị con trỏ nhấp nháy */
            isActive && (
              <span className="h-6 w-[2px] bg-[#b84a39] animate-blink"></span>
            )
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col items-center py-4">
      <h2 className="text-[16px] font-black uppercase text-[#7b4b34] transition-all">
        {step === "create" ? "Tạo mã PIN 4 số" : "Xác nhận lại mã PIN"}
      </h2>

      <p className="mt-1 min-h-[20px] text-[13px] font-semibold text-[#7b6254] text-center">
        {step === "create"
          ? "Mã PIN này sẽ dùng để đăng nhập"
          : "Vui lòng nhập lại mã PIN vừa tạo"}
      </p>

      {/* Wrapper chứa Input vô hình và UI giả */}
      <div
        className={`relative mt-6 flex justify-center transition-transform ${isError ? "animate-shake" : ""}`}
      >
        {/* Lớp hiển thị: 4 ô vuông riêng biệt */}
        <div className="flex gap-3">{renderFakeBoxes()}</div>

        {/* Lớp logic: Input duy nhất, trong suốt (opacity-0) đè lên toàn bộ */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          maxLength={4}
          value={currentValue}
          disabled={isLoading}
          autoFocus
          onChange={(event) => setCurrentValue(sanitizePin(event.target.value))}
          onFocus={() => {
            setIsFocused(true);
            keepPinVisible();
          }}
          onBlur={() => setIsFocused(false)}
          className="absolute inset-0 h-full w-full cursor-text opacity-0 outline-none"
        />
      </div>

      {isError && (
        <p className="mt-4 text-[13px] font-bold text-red-600">
          Mã PIN không khớp, thử lại nhé!
        </p>
      )}

      {step === "confirm" && !isLoading && !isError && (
        <button
          type="button"
          onClick={() => {
            setStep("create");
            setCurrentValue("");
            setFirstPin("");
            setIsError(false);
            inputRef.current?.focus();
          }}
          className="mt-6 text-[13px] font-bold text-[#7b6254] underline underline-offset-4"
        >
          Tạo mã PIN khác
        </button>
      )}
    </div>
  );
}
