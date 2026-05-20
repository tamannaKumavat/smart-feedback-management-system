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
    <div className="admin-portal min-h-screen w-full">
      <div className="admin-shell flex flex-col">
        <Topbar mode={mode} />
        <div className="admin-layout-grid grid grid-cols-1 items-stretch md:grid-cols-[200px_minmax(0,1fr)]">
          <Sidebar mode={mode} onLogout={handleLogout} />
          <main className="admin-main-panel min-h-0 min-w-0 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
