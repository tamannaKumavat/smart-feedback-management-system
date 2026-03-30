import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../../layouts/AuthLayout.jsx'
import * as authApi from '../../lib/authApi.js'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState(null)

  function validate() {
    if (!email.trim()) {
      setError('Email is required')
      return false
    }
    setError('')
    return true
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      await authApi.forgotPassword({ email: email.trim() })
      setStatus({ type: 'success', message: 'If an account exists, a reset link would be sent (see server console).' })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Forgot Password" subtitle="Enter your email to reset your password">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="forgot-email" className="auth-label">
            Email Address
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError('')
            }}
            className={`auth-input ${error ? 'auth-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? 'forgot-email-error' : undefined}
          />
          {error ? (
            <p id="forgot-email-error" className="mt-1.5 text-caption text-brand-red" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <p className="text-body-sm text-content-muted leading-relaxed">
          We&apos;ll send you a link to reset your password. Please check your inbox after submitting.
        </p>

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
          {submitting ? 'Sending…' : 'Send Reset Link'}
        </button>

        <p className="pt-2 text-center">
          <Link to="/login" className="auth-link inline-flex items-center gap-1 text-body-sm">
            <span aria-hidden>←</span> Back to Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
