"use client";

import { useState, useRef, useEffect } from "react";

interface Country {
  code: string;
  name: string;
  dial: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "ID", name: "Indonesia", dial: "+62", flag: "\ud83c\uddee\ud83c\udde9" },
  { code: "US", name: "United States", dial: "+1", flag: "\ud83c\uddfa\ud83c\uddf8" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "\ud83c\uddec\ud83c\udde7" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "\ud83c\uddf8\ud83c\uddec" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "\ud83c\uddf2\ud83c\uddfe" },
  { code: "TH", name: "Thailand", dial: "+66", flag: "\ud83c\uddf9\ud83c\udded" },
  { code: "VN", name: "Vietnam", dial: "+84", flag: "\ud83c\uddfb\ud83c\uddf3" },
  { code: "PH", name: "Philippines", dial: "+63", flag: "\ud83c\uddf5\ud83c\udded" },
  { code: "IN", name: "India", dial: "+91", flag: "\ud83c\uddee\ud83c\uddf3" },
  { code: "JP", name: "Japan", dial: "+81", flag: "\ud83c\uddef\ud83c\uddf5" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "\ud83c\uddf0\ud83c\uddf7" },
  { code: "CN", name: "China", dial: "+86", flag: "\ud83c\udde8\ud83c\uddf3" },
  { code: "HK", name: "Hong Kong", dial: "+852", flag: "\ud83c\udded\ud83c\uddf0" },
  { code: "TW", name: "Taiwan", dial: "+886", flag: "\ud83c\uddf9\ud83c\uddfc" },
  { code: "AU", name: "Australia", dial: "+61", flag: "\ud83c\udde6\ud83c\uddfa" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "\ud83c\uddf3\ud83c\uddff" },
  { code: "AE", name: "UAE", dial: "+971", flag: "\ud83c\udde6\ud83c\uddea" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "\ud83c\uddf8\ud83c\udde6" },
  { code: "DE", name: "Germany", dial: "+49", flag: "\ud83c\udde9\ud83c\uddea" },
  { code: "FR", name: "France", dial: "+33", flag: "\ud83c\uddeb\ud83c\uddf7" },
  { code: "IT", name: "Italy", dial: "+39", flag: "\ud83c\uddee\ud83c\uddf9" },
  { code: "ES", name: "Spain", dial: "+34", flag: "\ud83c\uddea\ud83c\uddf8" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "\ud83c\udde7\ud83c\uddf7" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "\ud83c\uddf2\ud83c\uddfd" },
  { code: "CA", name: "Canada", dial: "+1", flag: "\ud83c\udde8\ud83c\udde6" },
  { code: "RU", name: "Russia", dial: "+7", flag: "\ud83c\uddf7\ud83c\uddfa" },
  { code: "TR", name: "Turkey", dial: "+90", flag: "\ud83c\uddf9\ud83c\uddf7" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "\ud83c\uddf5\ud83c\uddf0" },
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "\ud83c\udde7\ud83c\udde9" },
  { code: "NG", name: "Nigeria", dial: "+234", flag: "\ud83c\uddf3\ud83c\uddec" },
  { code: "EG", name: "Egypt", dial: "+20", flag: "\ud83c\uddea\ud83c\uddec" },
  { code: "ZA", name: "South Africa", dial: "+27", flag: "\ud83c\uddff\ud83c\udde6" },
];

interface PhoneInputProps {
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export default function PhoneInput({ value, onChange, placeholder = "Phone number", className = "", id }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Country>(COUNTRIES[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse initial value to extract country code
  useEffect(() => {
    if (value) {
      // Already has dial code with +
      const withPlus = COUNTRIES.find((c) => value.startsWith(c.dial));
      if (withPlus) {
        setSelected(withPlus);
        return;
      }

      const digits = value.replace(/[^\d]/g, "");
      if (!digits) return;

      // Digits start with a known dial code (without +) — e.g. "62812..."
      const dialMatch = COUNTRIES.find((c) => {
        const dialDigits = c.dial.replace("+", "");
        return digits.startsWith(dialDigits) && digits.length > dialDigits.length;
      });
      if (dialMatch) {
        setSelected(dialMatch);
        onChange(dialMatch.dial + digits.slice(dialMatch.dial.replace("+", "").length));
        return;
      }

      // Starts with 0 — strip leading zero and prepend selected dial
      if (digits.startsWith("0")) {
        onChange(selected.dial + digits.replace(/^0+/, ""));
        return;
      }

      // Raw digits — prepend selected dial
      onChange(selected.dial + digits);
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const phoneOnly = value.startsWith(selected.dial) ? value.slice(selected.dial.length) : value;

  const handleCountrySelect = (country: Country) => {
    setSelected(country);
    setOpen(false);
    setSearch("");
    onChange(country.dial + phoneOnly);
    inputRef.current?.focus();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d]/g, "");
    if (raw.startsWith("0")) raw = raw.replace(/^0+/, "");
    const dialDigits = selected.dial.replace("+", "");
    if (raw.startsWith(dialDigits)) raw = raw.slice(dialDigits.length);
    onChange(selected.dial + raw);
  };

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative flex ${className}`} id={id}>
      {/* Country code selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 h-full px-3 bg-gray-50 dark:bg-stone-800/40 border border-r-0 border-gray-200 dark:border-stone-700/50 rounded-l-xl text-sm hover:bg-gray-100 dark:hover:bg-stone-700 transition-colors"
        >
          <span className="text-base">{selected.flag}</span>
          <span className="text-xs font-bold text-gray-600 dark:text-stone-300">{selected.dial}</span>
          <svg className={`h-3 w-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-full left-0 z-[9999] mt-1 w-64 max-h-72 overflow-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-stone-700/50 dark:bg-stone-900/80">
            <div className="sticky top-0 p-2 bg-white dark:bg-stone-900/80 border-b border-gray-100 dark:border-stone-700/50">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country..."
                className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-stone-800/40 border border-gray-200 dark:border-stone-700/50 rounded-lg outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
            {filtered.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-left text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors ${selected.code === country.code ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold" : "text-gray-700 dark:text-stone-300"}`}
              >
                <span className="text-base">{country.flag}</span>
                <span className="flex-1 truncate">{country.name}</span>
                <span className="text-[10px] font-bold text-gray-400">{country.dial}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400 text-center">No countries found</p>
            )}
          </div>
        )}
      </div>

      {/* Phone number input */}
      <input
        ref={inputRef}
        type="tel"
        value={phoneOnly}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-4 py-2.5 bg-gray-50 dark:bg-stone-800/40 border border-gray-200 dark:border-stone-700/50 rounded-r-xl outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-400 transition-colors"
      />
    </div>
  );
}

export function parsePhone(value: string): { countryCode: string; number: string } {
  const match = COUNTRIES.find((c) => value.startsWith(c.dial));
  if (match) {
    return { countryCode: match.code, number: value.slice(match.dial.length) };
  }
  return { countryCode: "", number: value };
}

export function formatPhoneDisplay(value: string): string {
  if (!value) return "";
  const match = COUNTRIES.find((c) => value.startsWith(c.dial));
  if (match) {
    const num = value.slice(match.dial.length);
    return `${match.flag} ${match.dial} ${num}`;
  }
  return value;
}
