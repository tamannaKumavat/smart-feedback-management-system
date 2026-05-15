import { motion } from "framer-motion";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import { fadeIn } from "../lib/motion.js";
import { useClientTheme } from "../providers/ClientThemeProvider.jsx";

export default function ClientPortalChrome({ children, onLogout }) {
  const { isDark, toggleTheme } = useClientTheme();

  return (
    <motion.div
      className="client-shell flex h-full min-h-0 flex-col overflow-hidden"
      initial={fadeIn.initial}
      animate={fadeIn.animate}
      transition={fadeIn.transition}
    >
      <div className="shrink-0">
        <Topbar
          mode="client"
          showThemeToggle
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />
      </div>
      <div className="client-layout-grid grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[200px_minmax(0,1fr)]">
        <Sidebar mode="client" onLogout={onLogout} />
        <main className="client-main-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
          {children}
        </main>
      </div>
    </motion.div>
  );
}
