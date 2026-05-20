import de from "./locales/de.js";
import en from "./locales/en.js";
import fr from "./locales/fr.js";
import it from "./locales/it.js";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./config.js";

const catalogs = { en, de, fr, it };

export function getCatalog(locale) {
  return catalogs[locale] ?? catalogs[DEFAULT_LOCALE];
}

export function isSupportedLocale(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

function getNested(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function interpolate(template, vars) {
  if (!template || !vars) return template ?? "";
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : "",
  );
}

export function translate(locale, key, vars) {
  const catalog = getCatalog(locale);
  const value = getNested(catalog, key);
  if (value == null) {
    const fallback = getNested(catalogs[DEFAULT_LOCALE], key);
    return interpolate(fallback ?? key, vars);
  }
  if (typeof value === "string") return interpolate(value, vars);
  return key;
}
