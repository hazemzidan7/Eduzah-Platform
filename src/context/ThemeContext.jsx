import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "eduzah-theme";

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "light" || s === "dark") return s;
    } catch (_) {}
    return "dark";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (_) {}
    document.documentElement.dataset.theme = mode;
    document.body.dataset.theme = mode;
  }, [mode]);

  const toggle = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  const isDark = mode === "dark";

  return (
    <ThemeCtx.Provider value={{ mode, isDark, toggle, setMode }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) return { mode: "dark", isDark: true, toggle: () => {}, setMode: () => {} };
  return ctx;
}
