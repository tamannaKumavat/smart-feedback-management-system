import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import { clearSession } from "../lib/session.js";
import { ClientThemeProvider } from "../providers/ClientThemeProvider.jsx";
import ClientPortalChrome from "./ClientPortalChrome.jsx";

export default function PortalLayout({ mode, children }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  if (mode === "client") {
    return (
      <ClientThemeProvider>
        <ClientPortalChrome onLogout={handleLogout}>
          {children}
        </ClientPortalChrome>
      </ClientThemeProvider>
    );
  }

  return (
    <div className="min-h-screen w-full bg-surface-page">
      <Topbar mode={mode} />
      <div className="grid grid-cols-1 items-stretch rounded-[16px] md:grid-cols-[200px_minmax(0,1fr)]">
        <Sidebar mode={mode} onLogout={handleLogout} />
        <main className="min-h-0 min-w-0 overflow-x-hidden rounded-lg bg-surface-muted px-4 py-4 shadow-card sm:px-6 sm:py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
