import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import { clearSession } from "../lib/session.js";

export default function PortalLayout({ mode, children }) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div className="min-h-screen w-full">
      <Topbar onLogout={handleLogout} mode={mode} />
      <div className="grid grid-cols-1 rounded-[16px] items-stretch md:grid-cols-[200px_minmax(0,1fr)]">
        <Sidebar mode={mode} onLogout={handleLogout} />
        <main className="min-h-0 min-w-0 overflow-x-hidden px-4 bg-surface-muted py-4 sm:px-6 sm:py-4 rounded-lg shadow-md ">
          {children}
        </main>
      </div>
    </div>
  );
}
