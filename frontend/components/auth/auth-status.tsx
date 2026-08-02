"use client";

import { useAuth } from "@/lib/auth/auth-context";

export function AuthStatus() {
  const { signOut, user } = useAuth();
  const email = user?.email ?? "Signed in";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
        {email}
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        Log out
      </button>
    </div>
  );
}
