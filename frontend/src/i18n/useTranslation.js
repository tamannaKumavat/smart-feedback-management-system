import { useCallback, useSyncExternalStore } from "react";
import { LOCALE_LABEL_KEYS, SUPPORTED_LOCALES } from "./config.js";
import { getLocale, setLocale, subscribe } from "./localeStore.js";
import { translate } from "./translations.js";

export function useTranslation() {
  const locale = useSyncExternalStore(subscribe, getLocale, () => getLocale());

  const t = useCallback(
    (key, vars) => translate(locale, key, vars),
    [locale],
  );

  const languageOptions = SUPPORTED_LOCALES.map((code) => ({
    value: code,
    labelKey: LOCALE_LABEL_KEYS[code],
  }));

  return { t, locale, setLocale, languageOptions };
}
