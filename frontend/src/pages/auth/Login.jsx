import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation.js";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import * as authApi from "../../lib/authApi.js";
import { saveSession } from "../../lib/session.js";
import PasswordToggleButton from "../../components/auth/PasswordToggleButton.jsx";
import { showError, showSuccess } from "../../lib/toast.js";

const initialErrors = { email: "", password: "" };

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState(initialErrors);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = { ...initialErrors };
    if (!email.trim()) next.email = t("auth.login.emailRequired");
    if (!password) next.password = t("auth.login.passwordRequired");
    setErrors(next);
    return !next.email && !next.password;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const response = await authApi.login({
        email: email.trim(),
        password,
        rememberMe,
      });
      if (!response?.user?.role) {
        throw new Error("Login response is invalid (missing user role).");
      }
      saveSession(response.user, response.accessToken);
      showSuccess(response.message || t("auth.login.success"));
      const role = String(response.user.role).toLowerCase();
      navigate(role === "admin" ? "/admin/dashboard" : "/client/dashboard", {
        replace: true,
      });
    } catch (err) {
      showError(err, t("auth.login.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="login-email" className="auth-label">
            {t("auth.login.email")}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.login.emailPlaceholder")}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((s) => ({ ...s, email: "" }));
            }}
            className={`auth-input ${errors.email ? "auth-input-error" : ""}`}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "login-email-error" : undefined}
          />
          {errors.email ? (
            <p
              id="login-email-error"
              className="mt-1.5 text-caption text-brand-red"
              role="alert"
            >
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="login-password" className="auth-label">
            {t("auth.login.password")}
          </label>
          <div className="relative">
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder={t("auth.login.password")}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((s) => ({ ...s, password: "" }));
              }}
              className={`auth-input pr-10 ${errors.password ? "auth-input-error" : ""}`}
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "login-password-error" : undefined
              }
            />
            <PasswordToggleButton
              isVisible={showPassword}
              onClick={() => setShowPassword((s) => !s)}
              controlsId="login-password"
            />
          </div>
          {errors.password ? (
            <p
              id="login-password-error"
              className="mt-1.5 text-caption text-brand-red"
              role="alert"
            >
              {errors.password}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-body-sm text-content-muted">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border-input accent-brand-gray focus:ring-brand-gray"
            />
            {t("auth.login.rememberMe")}
          </label>
          <Link
            to="/forgot-password"
            className="auth-link text-body-sm sm:text-right"
          >
            {t("auth.login.forgotPassword")}
          </Link>
        </div>

        <button type="submit" className="auth-btn-primary" disabled={submitting}>
          {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </button>

        <p className="pt-2 text-center text-body-sm text-content-muted">
          {t("auth.login.noAccount")}{" "}
          <Link to="/signup" className="auth-link">
            {t("auth.login.signUp")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
