"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from "react";
import { formatNumber, parseNumber } from "@/lib/format";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  decimals?: number;
  separators?: boolean;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export default function NumberInput({
  value,
  onChange,
  decimals = 2,
  separators = true,
  min,
  max,
  placeholder = "0.00",
  disabled = false,
  required = false,
  className = "",
}: NumberInputProps) {
  const fmt = (v: number) => formatNumber(v, decimals, separators);
  const [displayValue, setDisplayValue] = useState(() => fmt(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(fmt(value));
    }
  }, [value, decimals, separators, isFocused]);

  const handleFocus = useCallback(
    () => {
      setIsFocused(true);
      const raw = parseNumber(displayValue);
      setDisplayValue(raw === 0 && !value ? "" : String(raw));
    },
    [displayValue, value]
  );

  const handleBlur = useCallback(
    () => {
      setIsFocused(false);
      const raw = parseNumber(displayValue);
      const clamped = min !== undefined ? Math.max(min, raw) : raw;
      const final = max !== undefined ? Math.min(max, clamped) : clamped;
      setDisplayValue(fmt(final));
      if (final !== value) onChange(final);
    },
    [displayValue, decimals, min, max, onChange, value]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (raw === "" || /^-?\d*\.?\d*$/.test(raw)) {
        setDisplayValue(raw);
      }
    },
    []
  );

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={`w-full rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white dark:placeholder-zinc-500 ${className}`}
    />
  );
}
