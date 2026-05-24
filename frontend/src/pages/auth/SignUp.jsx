import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n/useTranslation.js";
import AuthLayout from "../../layouts/AuthLayout.jsx";
import * as authApi from '../../lib/authApi.js'
import PasswordToggleButton from '../../components/auth/PasswordToggleButton.jsx'
import { showError, showSuccess } from '../../lib/toast.js'

const initialErrors = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: '',
}

export default function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [errors, setErrors] = useState(initialErrors)
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const next = { ...initialErrors }
    if (!fullName.trim()) next.fullName = t("auth.signup.fullNameRequired");
    if (!email.trim()) next.email = t("auth.signup.emailRequired");
    if (!password) next.password = t("auth.signup.passwordRequired");
    if (password && !confirmPassword)
      next.confirmPassword = t("auth.signup.confirmRequired");
    else if (password && confirmPassword !== password)
      next.confirmPassword = t("auth.signup.passwordMismatch");
    if (!agreeToTerms) next.terms = t("auth.signup.termsRequired");
    setErrors(next)
    return Object.values(next).every((v) => !v)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const response = await authApi.signup({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        agreeToTerms,
      })
      showSuccess(response.message || t("auth.signup.success"));
      setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      showError(err, t("auth.signup.error"));
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title={t("auth.signup.title")} subtitle={t("auth.signup.subtitle")}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="signup-name" className="auth-label">
            {t("auth.signup.fullName")}
          </label>
          <input
            id="signup-name"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value)
              if (errors.fullName) setErrors((s) => ({ ...s, fullName: '' }))
            }}
            className={`auth-input ${errors.fullName ? 'auth-input-error' : ''}`}
          />
          {errors.fullName ? (
            <p className="mt-1.5 text-caption text-brand-red" role="alert">
              {errors.fullName}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="signup-email" className="auth-label">
            {t("auth.signup.email")}
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((s) => ({ ...s, email: '' }))
            }}
            className={`auth-input ${errors.email ? 'auth-input-error' : ''}`}
          />
          {errors.email ? (
            <p className="mt-1.5 text-caption text-brand-red" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="signup-password" className="auth-label">
            {t("auth.signup.password")}
          </label>
          <div className="relative">
            <input
              id="signup-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (errors.password) setErrors((s) => ({ ...s, password: '' }))
              }}
              className={`auth-input pr-10 ${errors.password ? 'auth-input-error' : ''}`}
            />
            <PasswordToggleButton
              isVisible={showPassword}
              onClick={() => setShowPassword((s) => !s)}
              controlsId="signup-password"
            />
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-caption text-brand-red" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="signup-confirm" className="auth-label">
            {t("auth.signup.confirmPassword")}
          </label>
          <div className="relative">
            <input
              id="signup-confirm"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (errors.confirmPassword) setErrors((s) => ({ ...s, confirmPassword: '' }))
              }}
              className={`auth-input pr-10 ${errors.confirmPassword ? 'auth-input-error' : ''}`}
            />
            <PasswordToggleButton
              isVisible={showConfirmPassword}
              onClick={() => setShowConfirmPassword((s) => !s)}
              controlsId="signup-confirm"
            />
          </div>
          {errors.confirmPassword ? (
            <p className="mt-1.5 text-caption text-brand-red" role="alert">
              {errors.confirmPassword}
            </p>
          ) : null}
        </div>

        <div>
          <label className="flex cursor-pointer items-start gap-2 text-body-sm text-content-muted">
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => {
                setAgreeToTerms(e.target.checked)
                if (errors.terms) setErrors((s) => ({ ...s, terms: '' }))
              }}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-input accent-brand-gray focus:ring-brand-gray"
            />
            <span>
              {t("auth.signup.termsPrefix")}{" "}
              <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>
                {t("auth.signup.termsLink")}
              </a>{" "}
              {t("auth.signup.and")}{" "}
              <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>
                {t("auth.signup.privacyLink")}
              </a>
            </span>
          </label>
          {errors.terms ? (
            <p className="mt-1.5 text-caption text-brand-red" role="alert">
              {errors.terms}
            </p>
          ) : null}
        </div>

        <button type="submit" className="auth-btn-primary" disabled={submitting}>
          {submitting ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </button>

        <p className="pt-2 text-center text-body-sm text-content-muted">
          {t("auth.signup.hasAccount")}{" "}
          <Link to="/login" className="auth-link">
            {t("auth.signup.signIn")}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
