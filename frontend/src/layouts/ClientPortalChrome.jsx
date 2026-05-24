import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import { fadeIn } from "../lib/motion.js";
import { useClientTheme } from "../providers/ClientThemeProvider.jsx";

export default function ClientPortalChrome({ children, onLogout }) {
  const { isDark, toggleTheme } = useClientTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (media.matches) setMobileNavOpen(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

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
          onMenuToggle={() => setMobileNavOpen((open) => !open)}
          menuOpen={mobileNavOpen}
        />
      </div>
      <div className="client-layout-grid grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="hidden min-h-0 md:block">
          <Sidebar mode="client" onLogout={onLogout} />
        </div>
        <main className="client-main-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-6 sm:py-5">
          {children}
        </main>
      </div>

      <AnimatePresence>
        {mobileNavOpen ? (
          <>
            <motion.button
              type="button"
              className="client-mobile-nav-backdrop fixed inset-0 z-40 bg-slate-900/45 md:hidden"
              aria-label="Close menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileNav}
            />
            <motion.aside
              className="client-mobile-nav-drawer fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <Sidebar
                mode="client"
                onLogout={onLogout}
                onNavClick={closeMobileNav}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
