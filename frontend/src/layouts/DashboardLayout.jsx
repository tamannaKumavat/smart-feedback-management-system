import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearSession } from "../lib/session.js";
import WebLogo from "../components/WebLogo.jsx";

function linkClassName({ isActive }) {
  return `block rounded-md px-3 py-2 text-sm transition ${
    isActive
      ? "bg-brand-red text-white"
      : "text-content-muted hover:bg-surface-page hover:text-content"
  }`;
}

export default function DashboardLayout({ title, user, navItems, children }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="border-b border-border-input bg-surface-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-3">
            <WebLogo className="h-8 w-auto sm:h-10" />
            <span className="text-sm font-semibold text-content sm:text-base">
              Feedback System
            </span>
          </Link>
          <button onClick={handleLogout} className="auth-link" type="button">
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:grid-cols-[240px_1fr] sm:px-6">
        <aside className="rounded-xl border border-border-input bg-surface-card p-4">
          <p className="mb-1 text-sm font-semibold text-content">
            {user.fullName}
          </p>
          <p className="mb-4 text-xs uppercase tracking-wide text-content-muted">
            {user.role}
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClassName}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="rounded-xl border border-border-input bg-surface-card p-5 sm:p-6">
          <h1 className="mb-6 text-xl font-semibold text-content">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
