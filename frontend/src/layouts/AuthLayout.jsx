import BrandLogo from '../components/auth/BrandLogo.jsx'

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="auth-page">
      <div className="flex w-full max-w-auth-card flex-col items-center">
        <BrandLogo />
        <h1 className="mt-6 text-center text-display-sm text-content sm:text-display-md">{title}</h1>
        {subtitle ? (
          <p className="mb-8 mt-2 text-center text-body-sm text-content-muted sm:text-body-md">{subtitle}</p>
        ) : (
          <div className="mb-8" />
        )}
        <div className="auth-card">{children}</div>
      </div>
    </div>
  )
}
