"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Terms-agreement screen. Shown after signup (and to any existing user who
 * hasn't accepted yet) before they can reach notes or AI features.
 *
 * A checkbox + Continue button (disabled until checked) records acceptance via
 * the auth context's acceptTerms(), which writes agreed_to_terms = true.
 */
const TERMS = [
  "Your notes and data are private — no other user can access them.",
  "Smart Jotter is provided as-is; we do our best to keep it safe and reliable, but no system is 100% guaranteed against issues.",
  "Please don't paste sensitive info (passwords, ID numbers, financial details, etc.) into the AI features — treat AI tools like a smart assistant, not a vault.",
  "Use Smart Jotter for legitimate note-taking and productivity only — not for illegal, harmful, or abusive purposes.",
  "Violating this may result in loss of access."
];

export function AgreementScreen() {
  const { acceptTerms } = useAuth();
  const [isChecked, setIsChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await acceptTerms();
      // The auth context flips hasAgreedToTerms → the gate re-renders to the app.
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save your agreement. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
      <div className="max-w-xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Smart Jotter
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
          Before you continue
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
          Please read and agree:
        </p>
      </div>

      <ul className="mt-6 max-w-xl space-y-3">
        {TERMS.map((term) => (
          <li
            key={term}
            className="flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-200"
          >
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"
            />
            <span>{term}</span>
          </li>
        ))}
      </ul>

      <form className="mt-8 max-w-xl space-y-5" onSubmit={handleSubmit}>
        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => setIsChecked(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-line text-accent focus:ring-accent"
          />
          <span>I have read and agree to these terms.</span>
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!isChecked || isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </section>
  );
}