"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function getVerifyOtpErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("expired")) {
    return "That verification code has expired. Request a new code and try again.";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("token") ||
    normalized.includes("otp") ||
    normalized.includes("code")
  ) {
    return "That code is not valid. Check the 6-digit code in your email and try again.";
  }

  return "We could not verify that code right now. Please try again.";
}

function getPasswordErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("weak") ||
    normalized.includes("password") ||
    normalized.includes("least") ||
    normalized.includes("length")
  ) {
    return "Your new password is too weak. Use a stronger password and try again.";
  }

  return "We could not update your password right now. Please try again.";
}

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const [isRequestSubmitting, setIsRequestSubmitting] = useState(false);
  const [isVerifySubmitting, setIsVerifySubmitting] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return;
    }

    setIsRequestSubmitting(true);
    setInfoMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await resetPassword(trimmedEmail);
    } catch {
      // Generic confirmation shown regardless of whether the email exists,
      // so we don't leak which addresses are registered.
    } finally {
      setRequestedEmail(trimmedEmail);
      setInfoMessage(
        "If an account exists for that email, we sent a 6-digit recovery code. " +
          "Enter that code below with your new password."
      );
      setIsRequestSubmitting(false);
    }
  };

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!requestedEmail) {
      return;
    }

    const sanitizedCode = otpCode.replace(/\s+/g, "");

    if (!/^\d{6}$/.test(sanitizedCode)) {
      setErrorMessage("Enter the 6-digit code from your email.");
      return;
    }

    setIsVerifySubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: requestedEmail,
      token: sanitizedCode,
      type: "recovery"
    });

    if (verifyError) {
      setErrorMessage(getVerifyOtpErrorMessage(verifyError.message));
      setIsVerifySubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      setErrorMessage(getPasswordErrorMessage(updateError.message));
      setIsVerifySubmitting(false);
      return;
    }

    setSuccessMessage("Password updated successfully. You can now sign in.");
    setOtpCode("");
    setNewPassword("");
    setIsVerifySubmitting(false);
  };

  const isOtpStep = Boolean(requestedEmail);

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
            {isOtpStep
              ? "Enter the 6-digit recovery code from your email and choose a new password."
              : "Enter your email and we'll send you a 6-digit recovery code."}
          </p>

          {!isOtpStep ? (
            <form className="mt-8 space-y-4" onSubmit={handleRequestSubmit}>
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

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isRequestSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {isRequestSubmitting ? "Sending code..." : "Send recovery code"}
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Back to login
                </Link>
              </div>
            </form>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={handleVerifySubmit}>
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700 dark:text-slate-200"
                  htmlFor="forgot-otp"
                >
                  6-digit code
                </label>
                <input
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) =>
                    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm tracking-[0.3em] text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
                  placeholder="123456"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-700 dark:text-slate-200"
                  htmlFor="forgot-new-password"
                >
                  New password
                </label>
                <input
                  id="forgot-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                />
              </div>

              {infoMessage ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  {infoMessage}
                </div>
              ) : null}

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={isVerifySubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  {isVerifySubmitting ? "Updating..." : "Verify code and update password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRequestedEmail(null);
                    setOtpCode("");
                    setNewPassword("");
                    setInfoMessage(null);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Use a different email
                </button>
                <Link
                  href="/reset-password"
                  className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Use reset link instead
                </Link>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}