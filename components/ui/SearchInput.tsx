"use client";

import { useRef, useCallback, type ChangeEvent } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  debounce = 300,
}: SearchInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChange(v), debounce);
    },
    [onChange, debounce]
  );

  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
      <input
        type="text"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm font-bold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700/50 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
      />
    </div>
  );
}
