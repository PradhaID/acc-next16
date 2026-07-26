"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { getDictionary, translate } from "@/lib/i18n";
import { DEFAULT_LOCALE, isLocale, type Dict, type Locale } from "@/lib/i18n/types";

interface LanguageContextValue {
  locale: Locale;
  dict: Dict;
  setLocale: (locale: Locale) => void;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  dict: getDictionary(DEFAULT_LOCALE),
  setLocale: () => {},
  t: (path: string) => path,
});

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  );

  const dict = useMemo(() => getDictionary(locale), [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next.replace("_", "-");
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale.replace("_", "-");
    }
  }, [locale]);

  const t = useCallback((path: string) => translate(dict, path), [dict]);

  return (
    <LanguageContext.Provider value={{ locale, dict, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  return useContext(LanguageContext).t;
}
