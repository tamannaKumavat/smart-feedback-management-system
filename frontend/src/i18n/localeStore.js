import {
  DEFAULT_LOCALE,
  DEPRECATED_LOCALES,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from "./config.js";

let locale = readStoredLocale();
const listeners = new Set();

function readStoredLocale() {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (DEPRECATED_LOCALES.includes(stored)) return DEFAULT_LOCALE;
    return SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function persistLocale(next) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getLocale() {
  return locale;
}

export function setLocale(next) {
  if (!SUPPORTED_LOCALES.includes(next) || next === locale) return;
  locale = next;
  persistLocale(next);
  listeners.forEach((listener) => listener(locale));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
