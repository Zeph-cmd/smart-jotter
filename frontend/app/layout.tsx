import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { FundingBanner } from "@/components/ui/funding-banner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Jotter",
  description: "A minimal note-taking app built to grow into an AI-first knowledge system."
};

type RootLayoutProps = {
  children: ReactNode;
};

const THEME_SCRIPT = `
(() => {
  try {
    const key = "smart-jotter-theme";
    const stored = window.localStorage.getItem(key);
    const theme = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch {}
})();
`;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="transition-colors duration-300">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <AuthProvider>
          <div className="min-h-screen">
            <header className="sticky top-0 z-40 border-b border-line/80 bg-mist/90 backdrop-blur dark:bg-slate-950/85">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                <Link
                  href="/"
                  className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:text-ink dark:text-slate-300 dark:hover:text-white"
                >
                  Smart Jotter
                </Link>
                <ThemeToggle />
              </div>
            </header>
            <FundingBanner />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
