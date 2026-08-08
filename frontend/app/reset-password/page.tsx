"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export default function ResetPasswordPage() {
  const { isLoading, session, signOut, updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // After Supabase redirects here from the recovery email, it exchanges the
  // recovery token in the URL for a session. The middleware + auth context
  // refresh that session, so we rely on `session` being populated to know the
  // recovery link was valid. While the auth context is still loading, we show
  // a neutral state.
  const isReady = !isLoading;
  const hasRecoverySession = Boolean(session);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await updatePassword(password);
      setMessage("Password updated. Redirecting you to log in...");
      // The recovery link established a temporary session. Sign the user out
      // so that the redirect lands them on the login screen (not the app),
      // letting them sign in fresh with their new password.
      try {
        await signOut();
      } catch {
        // Even if the cleanup sign-out fails, we still want to move the user
        // along to the login page.
      }
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update your password. The reset link may have expired."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // If loading finishes and there's no session, the recovery link was
  // invalid/expired or already used.
  useEffect(() => {
    if (isReady && !hasRecoverySession && !message) {
      setError(
        "This password reset link is invalid or has expired. Please request a new one."
      );
    }
  }, [isReady, hasRecoverySession, message]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Smart Jotter
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
            Set a new password
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            Choose a new password for your account.
          </p>

          {isLoading ? (
            <div className="mt-8 rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              Verifying your reset link…
            </div>
          ) : null}

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                htmlFor="reset-password"
              >
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
                placeholder="At least 6 characters"
                minLength={6}
                required
                disabled={!hasRecoverySession}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !hasRecoverySession}
                className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {isSubmitting ? "Updating..." : "Update password"}
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Back to login
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}