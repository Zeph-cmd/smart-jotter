"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";

export function AuthPanel() {
  const { resendConfirmation, signIn, signInWithGoogle, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
        // signUp() now signs the user in automatically, so on success the
        // auth context will redirect to the app. The message below only shows
        // briefly (or if auto-login failed and an error wasn't thrown).
        setMessage("Welcome to Smart Jotter! Redirecting to your notes...");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Authentication failed."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setMessage(null);

    try {
      await signInWithGoogle();
      // signInWithOAuth() redirects the browser to Google. If the Promise
      // resolves without error, keep the loading spinner on. The page will
      // unload during the redirect. Any thrown error is caught below.
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start Google sign-in."
      );
      setIsGoogleLoading(false);
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

      <div className="mt-8 max-w-md">
        <button
          type="button"
          onClick={() => void handleGoogleSignIn()}
          disabled={isGoogleLoading || isSubmitting}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm font-medium text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {isGoogleLoading ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <div className="my-6 flex items-center gap-3" aria-hidden="true">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
            or continue with email
          </span>
          <div className="h-px flex-1 bg-line" />
        </div>
      </div>

      <form className="max-w-md space-y-4" onSubmit={handleSubmit}>
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
          <div className="relative">
            <input
              id="auth-password"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 pr-12 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-xs font-medium text-slate-500 transition hover:text-ink dark:text-slate-400 dark:hover:text-slate-200"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? "Hide" : "Show"}
            </button>
          </div>
          {mode === "login" ? (
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-slate-500 transition hover:text-ink dark:text-slate-400 dark:hover:text-slate-200"
            >
              Forgot password?
            </Link>
          ) : null}
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
