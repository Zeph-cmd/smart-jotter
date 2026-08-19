import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact & Feedback" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" }
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line/80 bg-mist/60 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Link
              href="/"
              className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:text-ink dark:text-slate-300 dark:hover:text-white"
            >
              Smart Jotter
            </Link>
            <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              A minimal note-taking app built to grow into an AI-first knowledge
              system for students, professionals, and lifelong learners.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Company
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium text-slate-600 transition hover:text-ink dark:text-slate-300 dark:hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 border-t border-line/60 pt-6 text-xs text-slate-500 dark:text-slate-400">
          <p>© {year} Smart Jotter. All rights reserved.</p>
          <p className="mt-1">Smart Jotter isn&apos;t legally registered YET.</p>
          <p className="mt-1">
            For support, email{" "}
            <a
              href="mailto:support@smartjotter.com"
              className="font-medium text-slate-600 underline transition hover:text-ink dark:text-slate-300 dark:hover:text-white"
            >
              support@smartjotter.com
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}