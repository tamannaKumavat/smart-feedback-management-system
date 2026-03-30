import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout.jsx'
import * as authApi from '../../lib/authApi.js'

const initialErrors = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  terms: '',
}

export default function SignUp() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [errors, setErrors] = useState(initialErrors)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  function validate() {
    const next = { ...initialErrors }
    if (!fullName.trim()) next.fullName = 'Full name is required'
    if (!email.trim()) next.email = 'Email is required'
    if (!password) next.password = 'Password is required'
    if (password && !confirmPassword) next.confirmPassword = 'Please confirm your password'
    else if (password && confirmPassword !== password) next.confirmPassword = 'Passwords do not match'
    if (!agreeToTerms) next.terms = 'You must agree to continue'
    setErrors(next)
    return Object.values(next).every((v) => !v)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      await authApi.signup({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        agreeToTerms,
      })
      setStatus({ type: 'success', message: 'Account created (check server console for payload).' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Create Account" subtitle="Sign up to get started">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="signup-name" className="auth-label">
            Full Name
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
            Email Address
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
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((s) => ({ ...s, password: '' }))
            }}
            className={`auth-input ${errors.password ? 'auth-input-error' : ''}`}
          />
          {errors.password ? (
            <p className="mt-1.5 text-caption text-brand-red" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="signup-confirm" className="auth-label">
            Confirm Password
          </label>
          <input
            id="signup-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (errors.confirmPassword) setErrors((s) => ({ ...s, confirmPassword: '' }))
            }}
            className={`auth-input ${errors.confirmPassword ? 'auth-input-error' : ''}`}
          />
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
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-input accent-brand-teal focus:ring-brand-teal"
            />
            <span>
              I agree to the{' '}
              <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="auth-link" onClick={(e) => e.preventDefault()}>
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.terms ? (
            <p className="mt-1.5 text-caption text-brand-red" role="alert">
              {errors.terms}
            </p>
          ) : null}
        </div>

        {status?.type === 'error' ? (
          <p className="text-caption text-brand-red" role="alert">
            {status.message}
          </p>
        ) : null}
        {status?.type === 'success' ? (
          <p className="text-caption text-content-muted" role="status">
            {status.message}
          </p>
        ) : null}

        <button type="submit" className="auth-btn-primary" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="pt-2 text-center text-body-sm text-content-muted">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
