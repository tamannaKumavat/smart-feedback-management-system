import { useTranslation } from "@/i18n/useTranslation.js";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.53 6.53C4.13 7.86 2.62 10.1 2.25 12c.59 2.95 4.01 6.75 9.75 6.75 1.87 0 3.47-.4 4.82-1.04"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 4.96A11.65 11.65 0 0 1 12 5.25c6 0 9.75 6.75 9.75 6.75-.31.61-1.13 1.94-2.54 3.29"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PasswordToggleButton({ isVisible, onClick, controlsId }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="absolute inset-y-0 right-3 flex items-center text-content-muted hover:text-content"
      onClick={onClick}
      aria-label={isVisible ? t("auth.hidePassword") : t("auth.showPassword")}
      aria-controls={controlsId}
    >
      {isVisible ? <EyeSlashIcon /> : <EyeIcon />}
    </button>
  )
}
