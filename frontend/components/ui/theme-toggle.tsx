"use client";

import { useEffect, useState } from "react";

const THEME_STORAGE_KEY = "smart-jotter-theme";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const nextTheme = getPreferredTheme();
    applyTheme(nextTheme);
    setTheme(nextTheme);
    setIsReady(true);
  }, []);

  const handleToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex items-center justify-center rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800"
      aria-label={isReady && theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isReady && theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}
