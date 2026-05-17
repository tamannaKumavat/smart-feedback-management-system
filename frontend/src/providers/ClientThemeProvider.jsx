import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStoredClientTheme, setStoredClientTheme } from "../lib/clientTheme.js";

const ClientThemeContext = createContext(null);

export function ClientThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => getStoredClientTheme());

  useEffect(() => {
    setStoredClientTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  );

  return (
    <ClientThemeContext.Provider value={value}>
      <div
        className="client-portal h-dvh max-h-dvh w-full overflow-hidden bg-surface-page text-content"
        data-client-theme={theme}
      >
        {children}
      </div>
    </ClientThemeContext.Provider>
  );
}

export function useClientTheme() {
  const ctx = useContext(ClientThemeContext);
  if (!ctx) {
    throw new Error("useClientTheme must be used within ClientThemeProvider");
  }
  return ctx;
}

export function useClientThemeOptional() {
  return useContext(ClientThemeContext);
}
