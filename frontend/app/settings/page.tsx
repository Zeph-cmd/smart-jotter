"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPassword = Boolean(
    user?.identities?.some((identity) => identity.provider === "email") ||
      user?.app_metadata?.providers?.includes("email")
  );

  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account and all Smart Jotter data? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hasPassword ? { password } : {})
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete your account.");
      }
      try {
        await signOut();
      } catch {
        // The auth account is already gone; clear the local UI regardless.
      }
      window.location.assign("/");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete your account.");
      setIsDeleting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Account
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
            Settings
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
            Manage your account and permanently remove your Smart Jotter data.
          </p>

          {!user ? (
            <p className="mt-8 rounded-2xl border border-line bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              Sign in to manage your account.
            </p>
          ) : (
            <div className="mt-10 border-t border-line pt-8">
              <h2 className="text-xl font-semibold text-ink dark:text-slate-100">Delete account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                This permanently deletes your notes, learning data, usage records, subscriptions, and account.
              </p>
              {hasPassword ? (
                <label className="mt-6 block max-w-md text-sm font-medium text-slate-700 dark:text-slate-200">
                  Current password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none focus:border-accent dark:bg-slate-950 dark:text-slate-100"
                    autoComplete="current-password"
                    required
                  />
                </label>
              ) : (
                <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                  Because you use Google Sign-In, sign in again immediately before confirming deletion.
                </p>
              )}
              {error ? <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
              <button
                type="button"
                onClick={() => void deleteAccount()}
                disabled={isDeleting || (hasPassword && !password)}
                className="mt-6 rounded-full bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? "Deleting account..." : "Permanently delete account"}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}