import { FiBell, FiMoon, FiSearch, FiSettings, FiShare2, FiSun } from "react-icons/fi";
import { Link } from "react-router-dom";
import { ClientLanguageSwitcher } from "@/i18n";
import { useTranslation } from "@/i18n/useTranslation.js";
import WebLogo from "./WebLogo.jsx";
import { getSession } from "../lib/session.js";

function IconButton({ children, hasDot = false, className = "", onClick, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-card text-content-muted transition hover:bg-surface-muted hover:text-content ${className}`}
    >
      {children}
      {hasDot ? (
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-red" />
      ) : null}
    </button>
  );
}

function ThemeToggleButton({ isDark, onToggle, t }) {
  const label = isDark ? t("topbar.switchToLight") : t("topbar.switchToDark");
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      className="client-theme-toggle inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium shadow-sm transition"
    >
      {isDark ? (
        <>
          <FiSun className="text-[16px]" aria-hidden />
          <span>{t("topbar.light")}</span>
        </>
      ) : (
        <>
          <FiMoon className="text-[16px]" aria-hidden />
          <span>{t("topbar.dark")}</span>
        </>
      )}
    </button>
  );
}

export default function Topbar({
  mode,
  showThemeToggle = false,
  isDark = false,
  onToggleTheme,
}) {
  const { t } = useTranslation();
  const session = getSession();
  const user = session?.user;
  const isClient = mode === "client";
  const fullName = String(user?.fullName || "").trim();
  const email = String(user?.email || "").trim();
  const initialsFromName = fullName
    ? fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("")
    : "";
  const avatarText =
    initialsFromName || email.slice(0, 2).toUpperCase() || "AD";

  const portalTitle = isClient
    ? t("topbar.clientPortal")
    : "Admin Portal";
  const searchPlaceholder = isClient
    ? t("topbar.searchPlaceholder")
    : "Search anything...";

  return (
    <header
      className={`sticky top-0 z-20 backdrop-blur ${
        isClient
          ? `client-topbar ${isDark ? "border-b border-border-subtle bg-surface-card/95" : "border-0"}`
          : "admin-topbar"
      }`}
    >
      <div className="mx-auto flex h-16 items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link to="/" className="inline-flex min-w-0 shrink items-center gap-3">
          <WebLogo className="h-8 w-auto sm:h-10" />
          <span className="hidden text-lg font-semibold text-content sm:inline">
            {portalTitle}
          </span>
        </Link>

        <div className="hidden max-w-[480px] flex-1 lg:flex">
          <div className="flex h-11 w-full items-center gap-3 rounded-2xl bg-surface-muted px-4">
            <FiSearch className="text-content-muted" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-captionlarge text-content placeholder:text-content-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {isClient && showThemeToggle && onToggleTheme ? (
            <>
              <ClientLanguageSwitcher
                id="topbar-language"
                variant="topbar"
                className="w-auto shrink-0"
              />
              <ThemeToggleButton
                isDark={isDark}
                onToggle={onToggleTheme}
                t={t}
              />
            </>
          ) : null}
          <IconButton ariaLabel={isClient ? t("topbar.settings") : "Settings"}>
            <FiSettings size={16} />
          </IconButton>
          <IconButton
            hasDot
            ariaLabel={isClient ? t("topbar.notifications") : "Notifications"}
          >
            <FiBell size={16} />
          </IconButton>
          <IconButton ariaLabel={isClient ? t("topbar.share") : "Share"}>
            <FiShare2 size={16} />
          </IconButton>
          <span className="ml-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gray text-captionsmall font-semibold text-white">
            {avatarText}
          </span>
        </div>
      </div>
    </header>
  );
}
