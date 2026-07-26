import { en_US } from "./en_US";
import { id_ID } from "./id_ID";
import { DEFAULT_LOCALE, isLocale, type Dict, type Locale } from "./types";

const DICTS: Record<Locale, Dict> = {
  en_US,
  id_ID,
};

export function getDictionary(locale?: string): Dict {
  if (isLocale(locale)) return DICTS[locale];
  return DICTS[DEFAULT_LOCALE];
}

export function getLocaleLabel(locale: Locale): string {
  return getDictionary(locale).language[locale];
}

/**
 * Resolve a dotted path (e.g. "dashboard.stats.users") against a dictionary.
 * Falls back to the key itself when not found so the UI never breaks.
 */
export function translate(dict: Dict, path: string): string {
  const value = path
    .split(".")
    .reduce<any>((acc, key) => (acc == null ? acc : acc[key]), dict);
  return typeof value === "string" ? value : path;
}
