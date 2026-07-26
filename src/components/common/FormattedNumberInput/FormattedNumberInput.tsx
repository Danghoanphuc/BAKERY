/* Hallmark · component: formatted number input · genre: editorial commerce · theme: SweetTime
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: inherited from the existing form control tokens
 */
"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";

type NumericStatus = "default" | "loading" | "error" | "success";

export interface FormattedNumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "defaultValue" | "inputMode" | "onChange" | "type" | "value"
  > {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  maximumFractionDigits?: number;
  hideZero?: boolean;
  status?: NumericStatus;
}

interface ParsedNumericInput {
  display: string;
  value: number | null;
}

const INTEGER_FORMATTER = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

function fractionDigitsFromStep(step: FormattedNumberInputProps["step"]) {
  if (step === "any") return 6;
  if (step === undefined) return 0;

  const stepValue = String(step);
  const decimalIndex = stepValue.indexOf(".");
  return decimalIndex === -1 ? 0 : stepValue.length - decimalIndex - 1;
}

function groupIntegerDigits(digits: string) {
  const normalized = digits.replace(/^0+(?=\d)/, "") || "0";
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function numericBound(value: string | number | undefined) {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function formatNumericValue(
  value: number | null | undefined,
  maximumFractionDigits = 0,
  hideZero = true,
) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  if (hideZero && Object.is(value, 0)) return "";
  if (maximumFractionDigits === 0) return INTEGER_FORMATTER.format(value);

  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits,
    useGrouping: true,
  }).format(value);
}

export function parseNumericInput(
  rawValue: string,
  maximumFractionDigits = 0,
  allowNegative = false,
): ParsedNumericInput {
  const compact = rawValue.replace(/\s/g, "");
  const negative = allowNegative && compact.startsWith("-");
  const cleaned = compact.replace(/[^\d,.-]/g, "").replace(/-/g, "");

  if (!/\d/.test(cleaned)) {
    return {
      display: negative ? "-" : "",
      value: null,
    };
  }

  let decimalIndex = -1;
  if (maximumFractionDigits > 0) {
    const commaIndexes = [...cleaned.matchAll(/,/g)].map((match) => match.index ?? -1);
    const dotIndexes = [...cleaned.matchAll(/\./g)].map((match) => match.index ?? -1);
    const lastComma = commaIndexes[commaIndexes.length - 1] ?? -1;
    const lastDot = dotIndexes[dotIndexes.length - 1] ?? -1;

    if (lastComma >= 0 && lastDot >= 0) {
      decimalIndex = Math.max(lastComma, lastDot);
    } else if (lastComma >= 0) {
      const fractionLength = cleaned.slice(lastComma + 1).replace(/\D/g, "").length;
      if (commaIndexes.length === 1 || fractionLength <= maximumFractionDigits) {
        decimalIndex = lastComma;
      }
    } else if (lastDot >= 0) {
      const fractionLength = cleaned.slice(lastDot + 1).replace(/\D/g, "").length;
      const dotGroups = cleaned.split(".");
      const isVietnameseThousandsGroup =
        dotGroups.length > 1 &&
        /^\d{1,3}$/.test(dotGroups[0] ?? "") &&
        dotGroups[0] !== "0" &&
        dotGroups.slice(1).every((group) => /^\d{3}$/.test(group));
      if (
        fractionLength <= maximumFractionDigits &&
        !isVietnameseThousandsGroup
      ) {
        decimalIndex = lastDot;
      }
    }
  }

  const integerSource =
    decimalIndex >= 0 ? cleaned.slice(0, decimalIndex) : cleaned;
  const integerDigits = integerSource.replace(/\D/g, "") || "0";
  const fractionDigits =
    decimalIndex >= 0
      ? cleaned
          .slice(decimalIndex + 1)
          .replace(/\D/g, "")
          .slice(0, maximumFractionDigits)
      : "";
  const hasTrailingDecimal =
    decimalIndex >= 0 && cleaned.slice(decimalIndex + 1).replace(/\D/g, "") === "";
  const sign = negative ? "-" : "";
  const display = `${sign}${groupIntegerDigits(integerDigits)}${
    decimalIndex >= 0 ? `,${fractionDigits}` : ""
  }`;
  const numeric = Number(
    `${sign}${integerDigits}${fractionDigits ? `.${fractionDigits}` : ""}`,
  );

  return {
    display: hasTrailingDecimal ? `${sign}${groupIntegerDigits(integerDigits)},` : display,
    value: Number.isFinite(numeric) ? numeric : null,
  };
}

export const FormattedNumberInput = forwardRef<
  HTMLInputElement,
  FormattedNumberInputProps
>(function FormattedNumberInput(
  {
    value,
    onValueChange,
    maximumFractionDigits,
    hideZero = true,
    min,
    max,
    step,
    status = "default",
    disabled,
    readOnly,
    className,
    onBlur,
    onFocus,
    onKeyDown,
    ...props
  },
  forwardedRef,
) {
  const fractionDigits = useMemo(
    () => maximumFractionDigits ?? fractionDigitsFromStep(step),
    [maximumFractionDigits, step],
  );
  const minimum = numericBound(min);
  const maximum = numericBound(max);
  const allowNegative = minimum === undefined || minimum < 0;
  const focusedRef = useRef(false);
  const lastEmittedValueRef = useRef<number | null | undefined>(undefined);
  const [displayValue, setDisplayValue] = useState(() =>
    formatNumericValue(value, fractionDigits, hideZero),
  );

  useEffect(() => {
    if (
      focusedRef.current &&
      Object.is(value, lastEmittedValueRef.current)
    ) {
      return;
    }
    setDisplayValue(formatNumericValue(value, fractionDigits, hideZero));
  }, [fractionDigits, hideZero, value]);

  function emit(nextValue: number | null, nextDisplay: string) {
    lastEmittedValueRef.current = nextValue;
    setDisplayValue(nextDisplay);
    onValueChange(nextValue);
  }

  function clamp(valueToClamp: number) {
    return Math.min(maximum ?? valueToClamp, Math.max(minimum ?? valueToClamp, valueToClamp));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) {
      return;
    }

    event.preventDefault();
    const parsed = parseNumericInput(displayValue, fractionDigits, allowNegative);
    const increment = step === "any" ? 1 : numericBound(step) ?? 1;
    const direction = event.key === "ArrowUp" ? 1 : -1;
    const nextValue = clamp((parsed.value ?? value ?? 0) + increment * direction);
    emit(
      nextValue,
      formatNumericValue(nextValue, fractionDigits, false),
    );
  }

  const isLoading = status === "loading";

  return (
    <input
      {...props}
      ref={forwardedRef}
      type="text"
      role="spinbutton"
      inputMode={fractionDigits > 0 ? "decimal" : "numeric"}
      value={displayValue}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      readOnly={readOnly || isLoading}
      aria-busy={isLoading || undefined}
      aria-invalid={status === "error" || undefined}
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={hideZero && value === 0 ? undefined : value ?? undefined}
      data-state={status}
      className={className}
      onChange={(event) => {
        const parsed = parseNumericInput(
          event.target.value,
          fractionDigits,
          allowNegative,
        );
        emit(parsed.value, parsed.display);
      }}
      onFocus={(event) => {
        focusedRef.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focusedRef.current = false;
        const parsed = parseNumericInput(displayValue, fractionDigits, allowNegative);
        const nextValue = parsed.value === null ? null : clamp(parsed.value);
        lastEmittedValueRef.current = nextValue;
        setDisplayValue(formatNumericValue(nextValue, fractionDigits, hideZero));
        if (!Object.is(nextValue, parsed.value)) onValueChange(nextValue);
        onBlur?.(event);
      }}
      onKeyDown={handleKeyDown}
    />
  );
});
