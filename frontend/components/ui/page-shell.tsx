import Link from "next/link";
import type { ReactNode } from "react";

type PageShellProps = {
  /** Page eyebrow label, e.g. "About" */
  eyebrow: string;
  /** Main page heading */
  title: string;
  /** Optional subtitle paragraph shown under the title */
  subtitle?: string;
  /** Page body content */
  children: ReactNode;
};

/**
 * Shared layout shell for static content pages (About, FAQ, Terms, etc.)
 * Matches the rounded-card visual language used across Smart Jotter.
 */
export function PageShell({
  eyebrow,
  title,
  subtitle,
  children
}: PageShellProps) {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          ) : null}
        </section>

        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          {children}
        </section>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 underline transition hover:text-ink dark:text-slate-400 dark:hover:text-white"
          >
            Back to notes
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Small heading used inside a PageShell body for sections. */
export function PageSectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
      {children}
    </h2>
  );
}

/** Body paragraph used inside a PageShell body. */
export function PageParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
      {children}
    </p>
  );
}

/** Unordered list used inside a PageShell body. */
export function PageList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex gap-3 text-base leading-7 text-slate-600 dark:text-slate-300"
        >
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}