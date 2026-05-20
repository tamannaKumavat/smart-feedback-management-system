import { FiGlobe } from "react-icons/fi";
import Dropdown from "@/components/Dropdown.jsx";
import { useTranslation } from "@/i18n/useTranslation.js";

const LOCALE_CODES = {
  en: "EN",
  de: "DE",
  fr: "FR",
  it: "IT",
};

export default function ClientLanguageSwitcher({
  id = "client-language",
  className = "",
  variant = "default",
}) {
  const { t, locale, setLocale, languageOptions } = useTranslation();
  const isTopbar = variant === "topbar";

  const options = languageOptions.map((opt) => ({
    value: opt.value,
    label: t(opt.labelKey),
  }));

  const buttonClassName = isTopbar
    ? "client-theme-toggle !h-9 !min-h-0 !w-auto !gap-1.5 !rounded-full !border !px-2.5 !py-0 !text-[12px] !font-medium !shadow-sm"
    : "!h-9 !min-h-0 !gap-2 !rounded-lg !border-border-input !bg-surface-card !py-0 !pl-3 !pr-2.5 !text-[12px] !font-medium !leading-none !text-[var(--client-accent)] !shadow-none hover:!bg-surface-muted focus-visible:!ring-2 focus-visible:!ring-brand-gray/30";

  const displayValue = isTopbar ? (
    <span className="inline-flex items-center gap-1.5">
      <FiGlobe className="text-[15px]" aria-hidden />
      <span>{LOCALE_CODES[locale] ?? locale.toUpperCase()}</span>
    </span>
  ) : null;

  return (
    <div className={className}>
      <label htmlFor={id} className="sr-only">
        {t("language.label")}
      </label>
      <Dropdown
        id={id}
        options={options}
        value={locale}
        onChange={setLocale}
        aria-label={t("language.label")}
        displayValue={displayValue}
        labelClassName={
          isTopbar ? "font-medium text-content" : "text-[var(--client-accent)] font-medium"
        }
        chevronClassName={
          isTopbar ? "text-content-muted" : "text-[var(--client-accent)]"
        }
        menuAlign={isTopbar ? "end" : "stretch"}
        menuClassName="!mt-1.5 !min-w-[10.5rem] !rounded-xl !border-border-subtle !bg-surface-card !py-1.5"
        menuShadowClass="shadow-card"
        selectedOptionClassName="bg-surface-muted text-[var(--client-accent)]"
        unselectedOptionClassName="text-content hover:bg-surface-muted hover:text-[var(--client-accent)]"
        buttonClassName={buttonClassName}
      />
    </div>
  );
}
