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
      <Topbar onLogout={handleLogout} />
      <div className="grid max-w-[1320px] grid-cols-1 rounded-[16px] items-stretch md:grid-cols-[240px_1fr]">
        <Sidebar mode={mode} onLogout={handleLogout} />
        <main className="px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
