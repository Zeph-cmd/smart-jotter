"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export function AuthPanel() {
  const { resendConfirmation, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shouldShowResendConfirmation =
    mode === "login" &&
    Boolean(error) &&
    (error?.toLowerCase().includes("email not confirmed") ?? false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setMessage("Account created. If email confirmation is enabled, check your inbox.");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Authentication failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendConfirmation = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      await resendConfirmation(email.trim());
      setMessage("Confirmation email sent. Open it on this same device and tap the link.");
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not resend confirmation email."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
      <div className="max-w-xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Smart Jotter
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
          Your private thinking system.
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
          Capture ideas in seconds, then turn them into answers, flashcards, and momentum.
        </p>
      </div>

      <form className="mt-8 max-w-md space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {shouldShowResendConfirmation ? (
          <button
            type="button"
            onClick={() => void handleResendConfirmation()}
            disabled={isResending || !email.trim()}
            className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {isResending ? "Sending confirmation..." : "Resend confirmation email"}
          </button>
        ) : null}

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
            {isSubmitting
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Log in"
                : "Sign up"}
          </button>

          <button
            type="button"
            onClick={() => setMode((current) => (current === "login" ? "signup" : "login"))}
            className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {mode === "login" ? "Create account" : "Have an account?"}
          </button>
        </div>
      </form>
    </section>
  );
}
