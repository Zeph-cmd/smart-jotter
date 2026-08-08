"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await resetPassword(email.trim());
      // Generic confirmation shown regardless of whether the email exists,
      // so we don't leak which addresses are registered.
      setMessage(
        "If an account exists for that email, a password reset link is on its way. " +
          "Please check your inbox (and spam folder)."
      );
    } catch {
      // Fall back to the generic confirmation so we don't leak which emails
      // are registered.
      setMessage(
        "If an account exists for that email, a password reset link is on its way. " +
          "Please check your inbox (and spam folder)."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Smart Jotter
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
            Forgot password?
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            Enter your email and we'll send you a link to reset your password.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                htmlFor="forgot-email"
              >
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
                placeholder="you@example.com"
                required
              />
            </div>

            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {isSubmitting ? "Sending link..." : "Send reset link"}
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