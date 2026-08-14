"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * /payment/callback
 *
 * The page a user lands on after completing (or abandoning) a payment on
 * Paystack's hosted checkout. Paystack redirects here with `reference` (and
 * `trxref`) in the query string.
 *
 * We re-verify the transaction server-side via /api/paystack/verify (which
 * checks the signature-free redirect params against Paystack's API) and show
 * a success / failure state. The webhook (/api/paystack/webhook) is the
 * authoritative backup; this page is purely informational for the user.
 *
 * NOTE: This page does NOT trust the query params alone — the verify route
 * calls Paystack's transaction.verify endpoint before activating anything.
 */

type CallbackState = "verifying" | "success" | "failed";

type VerifyResponse = {
  success?: boolean;
  message?: string;
  duplicate?: boolean;
  plan?: { activated?: "stt" | "ai"; planId?: string };
};

function planLabel(plan?: { activated?: "stt" | "ai"; planId?: string }): string {
  if (!plan?.activated) return "Your plan";
  return plan.activated === "stt"
    ? "Speech-to-Text plan"
    : "AI Writing Assist plan";
}

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference") ?? searchParams.get("trxref") ?? "";

  const [state, setState] = useState<CallbackState>("verifying");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const verifyCalledRef = useRef(false);

  useEffect(() => {
    if (verifyCalledRef.current) return;
    verifyCalledRef.current = true;

    if (!reference) {
      setState("failed");
      setErrorMessage(
        "No transaction reference was found in the redirect URL. " +
          "If you believe you were charged, please contact support."
      );
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference })
        });

        const data = (await res.json().catch(() => ({}))) as VerifyResponse;

        if (cancelled) return;

        if (res.ok && data.success) {
          setResult(data);
          setState("success");
        } else {
          setErrorMessage(
            data.message ??
              "We could not confirm your payment. If you were charged, please contact support."
          );
          setState("failed");
        }
      } catch {
        if (cancelled) return;
        setErrorMessage(
          "Could not reach the payment verification service. " +
            "If you were charged, please contact support — your payment is still safe."
        );
        setState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-xl">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Smart Jotter
          </p>

          {state === "verifying" ? (
            <>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
                Confirming your payment…
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                Please wait while we verify your transaction with Paystack. This
                only takes a moment.
              </p>
              <div className="mt-8 flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
                Verifying…
              </div>
            </>
          ) : state === "success" ? (
            <>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
                Payment successful
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                {result?.duplicate
                  ? `${planLabel(result?.plan)} was already active on your account. No duplicate charge was made.`
                  : `${planLabel(result?.plan)} has been activated successfully. You're all set!`}
              </p>
              {reference ? (
                <p className="mt-4 break-all text-xs text-slate-400 dark:text-slate-500">
                  Reference: <span className="font-mono">{reference}</span>
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Go to your notes
                </Link>
                <Link
                  href="/usage"
                  className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  View your plan
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
                Payment not confirmed
              </h1>
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
              {reference ? (
                <p className="mt-4 break-all text-xs text-slate-400 dark:text-slate-500">
                  Reference: <span className="font-mono">{reference}</span>
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Try again
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Contact support
                </Link>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    // useSearchParams() must be wrapped in a Suspense boundary in the App Router.
    <Suspense
      fallback={
        <main className="min-h-screen px-4 py-10 sm:px-6">
          <div className="mx-auto max-w-xl">
            <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Smart Jotter
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
                Loading…
              </h1>
            </section>
          </div>
        </main>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}