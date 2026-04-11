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
    try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}

    const isDark = mode === "dark";
    const root   = document.documentElement;
    const body   = document.body;

    // dataset flag (for any future CSS selectors)
    root.dataset.theme = mode;
    body.dataset.theme = mode;

    if (isDark) {
      // ── Dark theme ──────────────────────────────────────────
      body.style.background = "#1a0f24";
      body.style.color      = "#ffffff";
      root.style.setProperty("--page-bg",      "#1a0f24");
      root.style.setProperty("--page-color",   "#ffffff");
      root.style.setProperty("--card-bg",      "rgba(50,29,61,.58)");
      root.style.setProperty("--text-muted",   "rgba(255,255,255,.72)");
      root.style.setProperty("--border-col",   "rgba(255,255,255,.14)");
      root.style.setProperty("--nav-bg",       "rgba(26,15,36,.97)");
      root.style.setProperty("--nav-border",   "rgba(255,255,255,.10)");
      root.style.setProperty("--nav-bg-scrolled", "rgba(26,15,36,.99)");
    } else {
      // ── Light theme ─────────────────────────────────────────
      body.style.background = "#f5f3f8";
      body.style.color      = "#1a0a2e";
      root.style.setProperty("--page-bg",      "#f5f3f8");
      root.style.setProperty("--page-color",   "#1a0a2e");
      root.style.setProperty("--card-bg",      "rgba(255,255,255,.92)");
      root.style.setProperty("--text-muted",   "rgba(26,10,46,.6)");
      root.style.setProperty("--border-col",   "rgba(125,61,158,.2)");
      root.style.setProperty("--nav-bg",       "rgba(255,255,255,0.97)");
      root.style.setProperty("--nav-border",   "#e5e7eb");
      root.style.setProperty("--nav-bg-scrolled", "rgba(255,255,255,0.99)");
    }
  }, [mode]);

  const toggle = useCallback(() => setMode(m => m === "dark" ? "light" : "dark"), []);
  const isDark  = mode === "dark";

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
