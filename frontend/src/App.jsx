import { Link, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Detail from './pages/Detail.jsx'
import Login from './pages/auth/Login.jsx'
import SignUp from './pages/auth/SignUp.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'

function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-surface-page">
      <header className="border-b border-border-input bg-surface-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-content sm:text-xl">Smart Feedback Management System</h1>
          <nav className="flex flex-wrap items-center gap-4 text-body-sm">
            <Link to="/" className="text-content-muted hover:text-brand-teal">
              Home
            </Link>
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const authOnly =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/forgot-password'

  if (authOnly) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feedback/:caseId" element={<Detail />} />
      </Routes>
    </AppShell>
  )
}
