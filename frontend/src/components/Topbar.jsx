import { FiBell, FiMenu, FiMoon, FiSearch, FiSettings, FiShare2, FiSun, FiX } from "react-icons/fi";
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
      className={`client-topbar-icon-btn relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-muted text-content-muted transition hover:bg-surface-card hover:text-content ${className}`}
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
      className="client-theme-toggle inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm transition sm:w-auto sm:gap-1.5 sm:px-2.5"
    >
      {isDark ? (
        <>
          <FiSun className="text-[16px]" aria-hidden />
          <span className="hidden sm:inline">{t("topbar.light")}</span>
        </>
      ) : (
        <>
          <FiMoon className="text-[16px]" aria-hidden />
          <span className="hidden sm:inline">{t("topbar.dark")}</span>
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
  onMenuToggle,
  menuOpen = false,
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
    : t("topbar.adminPortal");
  const searchPlaceholder = t("topbar.searchPlaceholder");

  return (
    <header
      className={`sticky top-0 z-20 backdrop-blur ${
        isClient
          ? "client-topbar border-0"
          : "admin-topbar"
      }`}
    >
      <div className="mx-auto flex h-12 max-w-full items-center justify-between gap-1.5 px-2 sm:h-16 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          {isClient && onMenuToggle ? (
            <button
              type="button"
              onClick={onMenuToggle}
              className="client-topbar-icon-btn inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-muted text-content-muted transition hover:bg-surface-card hover:text-content md:hidden sm:h-9 sm:w-9"
              aria-label={menuOpen ? t("common.close") : t("sidebar.menu")}
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <FiX className="text-[17px]" aria-hidden />
              ) : (
                <FiMenu className="text-[17px]" aria-hidden />
              )}
            </button>
          ) : null}
          <Link to="/" className="inline-flex min-w-0 items-center gap-2 sm:gap-3">
            <WebLogo className="h-7 w-auto sm:h-10" />
            <span className="hidden truncate text-sm font-semibold text-content md:inline md:text-lg">
              {portalTitle}
            </span>
          </Link>
        </div>

        <div className="hidden max-w-[480px] flex-1 lg:flex">
          <div className="flex h-11 w-full items-center gap-3 rounded-2xl border border-border-subtle bg-surface-muted px-4">
            <FiSearch className="text-content-muted" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-captionlarge text-content placeholder:text-content-muted focus:outline-none"
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {isClient && showThemeToggle && onToggleTheme ? (
            <>
              <ClientLanguageSwitcher
                id="topbar-language"
                variant="topbar"
                className="shrink-0"
              />
              <ThemeToggleButton
                isDark={isDark}
                onToggle={onToggleTheme}
                t={t}
              />
            </>
          ) : null}
          {/* <IconButton ariaLabel={t("topbar.settings")}>
            <FiSettings size={16} />
          </IconButton>
          <IconButton hasDot ariaLabel={t("topbar.notifications")}>
            <FiBell size={16} />
          </IconButton>
          <IconButton ariaLabel={t("topbar.share")}>
            <FiShare2 size={16} />
          </IconButton> */}
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gray text-[11px] font-semibold text-white sm:ml-0.5 sm:h-9 sm:w-9 sm:text-captionsmall">
            {avatarText}
          </span>
        </div>
      </div>
    </header>
  );
}
