"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgreementScreen } from "@/components/auth/agreement-screen";
import { AuthStatus } from "@/components/auth/auth-status";
import { useAuth } from "@/lib/auth/auth-context";

type UsageFeatureRow = {
  feature: string;
  label: string;
  creditsUsed: number;
};

type UsageSummary = {
  planName: string;
  subscriptionStatus: string;
  subscriptionExpiry: string | null;
  creditsAllotted: number;
  creditsUsed: number;
  creditsRemaining: number;
  featureRows: UsageFeatureRow[];
};

/**
 * /usage — a simple, readable page showing the signed-in user's AI credit
 * balance, subscription status, and per-feature usage.
 *
 * DORMANT: works with zero data (defaults to 0s) since AI calls are still
 * disabled behind FEATURES_ENABLED.
 */
export default function UsagePage() {
  const {
    isAgreementLoading,
    hasAgreedToTerms,
    user
  } = useAuth();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isAgreementLoading || !hasAgreedToTerms) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadUsage = async () => {
      try {
        const response = await fetch("/api/usage");
        if (!response.ok) {
          throw new Error("Could not load your usage.");
        }
        const data = (await response.json()) as UsageSummary;
        if (!isCancelled) {
          setSummary(data);
        }
      } catch (caughtError) {
        if (!isCancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load your usage."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadUsage();

    return () => {
      isCancelled = true;
    };
  }, [hasAgreedToTerms, isAgreementLoading, user]);

  // Terms-agreement gate: signed-in users must accept before viewing usage.
  if (
    user &&
    (isAgreementLoading || hasAgreedToTerms === null || !hasAgreedToTerms)
  ) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <AgreementScreen />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {/* Header */}
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Smart Jotter
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
                Usage
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                Track your AI credits and see how much each feature has used.
              </p>
            </div>
            <AuthStatus />
          </div>
        </section>

        {!user ? (
          <section className="rounded-[32px] border border-line bg-white p-6 text-center text-slate-500 shadow-jotter dark:bg-slate-900 dark:text-slate-400 sm:p-8">
            Sign in to view your usage.
          </section>
        ) : null}

        {user && isLoading ? (
          <section className="rounded-[32px] border border-line bg-white p-6 text-center text-slate-500 shadow-jotter dark:bg-slate-900 dark:text-slate-400 sm:p-8">
            Loading your usage…
          </section>
        ) : null}

        {user && error ? (
          <section className="rounded-[32px] border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-jotter dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200 sm:p-8">
            {error}
          </section>
        ) : null}

        {user && summary ? (
          <>
            {/* Plan / subscription summary */}
            <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                AI Writing Assist Plan
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Plan
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink dark:text-slate-100">
                    {summary.planName}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Status
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold capitalize ${
                      summary.subscriptionStatus === "active"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-ink dark:text-slate-100"
                    }`}
                  >
                    {summary.subscriptionStatus}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Expires
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink dark:text-slate-100">
                    {summary.subscriptionExpiry
                      ? new Date(summary.subscriptionExpiry).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* Big credit display */}
            <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Credits
              </h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-3">
                <CreditStat label="Allotted" value={summary.creditsAllotted} />
                <CreditStat label="Used" value={summary.creditsUsed} />
                <CreditStat
                  label="Remaining"
                  value={summary.creditsRemaining}
                  emphasize
                />
              </div>

              {/* Visual usage bar */}
              <UsageBar
                used={summary.creditsUsed}
                allotted={summary.creditsAllotted}
              />
            </section>

            {/* Per-feature usage table */}
            <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Credits used by feature
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      <th className="py-3 pr-4 font-semibold">Feature</th>
                      <th className="py-3 pl-4 font-semibold text-right">
                        Credits used
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.featureRows.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-b border-line/60 last:border-0"
                      >
                        <td className="py-3 pr-4 font-medium text-ink dark:text-slate-100">
                          {row.label}
                        </td>
                        <td className="py-3 pl-4 text-right tabular-nums text-slate-600 dark:text-slate-300">
                          {row.creditsUsed}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="text-center">
              <Link
                href="/"
                className="text-sm font-medium text-slate-500 underline transition hover:text-ink dark:text-slate-400 dark:hover:text-white"
              >
                Back to notes
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}

function UsageBar({ used, allotted }: { used: number; allotted: number }) {
  const safeAllotted = Math.max(1, allotted);
  const percent = Math.min(100, Math.round((used / safeAllotted) * 100));
  const remaining = Math.max(0, allotted - used);

  // Color guidance: green < 50%, amber 50–79%, red ≥ 80%
  const barColor =
    percent >= 80
      ? "bg-red-500"
      : percent >= 50
        ? "bg-amber-500"
        : "bg-emerald-500";

  const guidance =
    remaining === 0
      ? "You've used all your credits. Subscribe to an AI Writing Assist plan to keep going."
      : percent >= 80
        ? "Heads up! You're almost out of credits. Consider upgrading soon."
        : percent >= 50
        ? "You're halfway through your credits. Pace yourself or top up soon."
        : "You're in good shape. Plenty of credits left.";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{percent}% used</span>
        <span>{remaining.toLocaleString()} remaining</span>
      </div>
      <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {guidance}
      </p>
    </div>
  );
}

function CreditStat({
  label,
  value,
  emphasize = false
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-4xl font-semibold tabular-nums ${
          emphasize
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-ink dark:text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}