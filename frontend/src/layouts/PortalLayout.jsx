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
      <div className="grid grid-cols-1 rounded-[16px] items-stretch md:grid-cols-[240px_1fr]">
        <Sidebar mode={mode} onLogout={handleLogout} />
        <main className="min-h-0 min-w-0 overflow-x-hidden px-4 py-4 sm:px-6 sm:py-4">{children}</main>
      </div>
    </div>
  );
}
