import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation.js";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import * as authApi from "../../lib/authApi.js";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  function validate() {
    if (!email.trim()) {
      setError(t("auth.forgot.emailRequired"));
      return false;
    }
    setError("");
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setStatus({ type: "success", message: t("auth.forgot.success") });
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="forgot-email" className="auth-label">
            {t("auth.forgot.email")}
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.login.emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            className={`auth-input ${error ? "auth-input-error" : ""}`}
            aria-invalid={!!error}
            aria-describedby={error ? "forgot-email-error" : undefined}
          />
          {error ? (
            <p
              id="forgot-email-error"
              className="mt-1.5 text-caption text-brand-red"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <p className="text-body-sm text-content-muted leading-relaxed">
          {t("auth.forgot.hint")}
        </p>

        {status?.type === "error" ? (
          <p className="text-caption text-brand-red" role="alert">
            {status.message}
          </p>
        ) : null}
        {status?.type === "success" ? (
          <p className="text-caption text-content-muted" role="status">
            {status.message}
          </p>
        ) : null}

        <button type="submit" className="auth-btn-primary" disabled={submitting}>
          {submitting ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
        </button>

        <p className="pt-2 text-center">
          <Link
            to="/login"
            className="auth-link inline-flex items-center gap-1 text-body-sm"
          >
            <span aria-hidden>←</span> {t("auth.forgot.backToLogin")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
