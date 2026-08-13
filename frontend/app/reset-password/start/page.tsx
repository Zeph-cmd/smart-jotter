"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Intermediate "reset password" landing page.
 *
 * Why this exists:
 * Email security scanners (Gmail, Brave Safe Browsing, anti-virus link
 * previews, etc.) prefetch/pre-visit links in emails BEFORE the user clicks
 * them. Supabase recovery tokens are single-use, so a scanner hitting the
 * raw confirmation URL burns the token — and by the time the real user
 * clicks, the link is "invalid or expired".
 *
 * The fix: the reset email links HERE, and the actual Supabase confirmation
 * URL is passed inside the URL *fragment* (after `#`), e.g.
 *   /reset-password/start#confirm=https://…/reset-password?type=recovery&…
 *
 * URL fragments are never sent to servers and never fetched by scanners, so
 * the token is never touched until the user genuinely clicks the button
 * below — at which point we redirect to the real confirmation URL and the
 * normal Supabase recovery flow takes over (landing on /reset-password).
 */
export default function ResetPasswordStartPage() {
  const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Read the confirmation URL from the fragment on mount. This is purely
  // client-side — the fragment never hits the server, so a scanner loading
  // this page sees only inert HTML with no token to consume.
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      setError(
        "This reset link is incomplete. Please use the button in your password reset email."
      );
      return;
    }

    // Strip the leading '#'. The fragment looks like:
    //   #confirm=<confirmation URL>
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;

    // The confirmation URL may or may not be URL-encoded depending on the
    // email client, so we tolerant-parse: accept `confirm=` prefix, then
    // decode whatever follows. decodeURIComponent is a no-op on an already-
    // raw URL and correctly decodes an encoded one.
    const prefix = "confirm=";
    if (raw.startsWith(prefix)) {
      const value = raw.slice(prefix.length);
      try {
        const decoded = decodeURIComponent(value);

        // Basic validation: only allow http(s) URLs to avoid open-redirect
        // abuse. The real Supabase confirmation URL always points at our own
        // origin (configured via NEXT_PUBLIC_SITE_URL), but we stay defensive.
        if (/^https?:\/\//i.test(decoded)) {
          setConfirmationUrl(decoded);
        } else {
          setError(
            "This reset link is malformed. Please request a new password reset email."
          );
        }
      } catch {
        setError(
          "This reset link is malformed. Please request a new password reset email."
        );
      }
    } else {
      setError(
        "This reset link is malformed. Please request a new password reset email."
      );
    }
  }, []);

  const handleResetClick = () => {
    if (!confirmationUrl) {
      return;
    }
    // Only NOW do we navigate to the Supabase confirmation URL — a genuine
    // user click. This is the moment the recovery token gets exchanged.
    setIsRedirecting(true);
    window.location.href = confirmationUrl;
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Smart Jotter
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
            Reset your password
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            Click the button below to continue. This keeps your secure reset
            link safe from email scanners.
          </p>

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetClick}
              disabled={!confirmationUrl || isRedirecting}
              className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {isRedirecting ? "Continuing..." : "Reset Password"}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back to login
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}