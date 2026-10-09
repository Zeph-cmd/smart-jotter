"use client";

import { useEffect, useState } from "react";
import {
  AI_SUBSCRIPTION_PLANS,
  STT_TOPUP_PLANS,
  SUBSCRIPTION_PLANS,
  formatPlanPrice,
  getPlanPrice,
  type PricingCurrency
} from "@/lib/config/plans";
import { usePricingCurrency } from "@/lib/pricing/use-currency";
import { useAuth } from "@/lib/auth/auth-context";
import { payWithPaystack } from "@/lib/paystack/client";
import type { PaystackMetadata } from "@/lib/paystack/types";

type PlanType = "stt" | "ai" | "stt_topup";

type PaymentStatus = {
  state: "idle" | "paying" | "success" | "error";
  message?: string;
};

/**
 * Shared payment flow: open the Paystack popup, then verify server-side.
 * Used by plan cards and top-up cards alike so the verify + grant path is
 * identical everywhere.
 */
async function payAndVerify(args: {
  email: string;
  amount: number;
  currency: PricingCurrency;
  metadata: PaystackMetadata;
}): Promise<{ ok: boolean; message: string }> {
  // 1. Open the Paystack popup.
  const { reference } = await payWithPaystack({
    email: args.email,
    amount: args.amount,
    currency: args.currency,
    metadata: args.metadata
  });

  // 2. Verify server-side and activate entitlements.
  const res = await fetch("/api/paystack/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reference })
  });

  const data = (await res.json()) as {
    success?: boolean;
    message?: string;
    error?: string;
  };

  if (res.ok && data.success) {
    return { ok: true, message: data.message ?? "Payment successful!" };
  }

  return {
    ok: false,
    message:
      data.error ??
      "Verification failed. If you were charged, please contact support."
  };
}

declare global {
  interface Window {
    ApplePaySession?: {
      canMakePayments?: () => boolean;
      canMakePaymentsWithActiveCard?: () => boolean;
    };
  }
}

/**
 * A green banner shown app-wide. When clicked, it expands to reveal the two
 * SEPARATE subscription tracks:
 *
 *   1. Speech-to-Text Plans  — recording time (subscription_status)
 *   2. AI Writing Assist Plans — credits for Improve/Explain/Search/Ask
 *      (ai_subscription_status)
 *
 * The two are independent purchases; a user can subscribe to either, both,
 * or neither. Both use the Paystack payment popup for instant activation.
 */
export function PlansBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const currency = usePricingCurrency();

  return (
    <div className="border-b border-emerald-600/40 bg-emerald-600 text-white">
      {/* Slim clickable line */}
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider transition hover:bg-emerald-700 sm:text-sm"
        aria-expanded={isExpanded}
      >
        <span aria-hidden="true">★</span>
        {isExpanded ? "Hide plans" : "View plans"}
      </button>

      {/* Expanded panel */}
      {isExpanded ? (
        <div className="border-t border-emerald-500/40 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl space-y-8">
            {/* Independence note */}
            <p className="rounded-2xl border border-emerald-400/40 bg-emerald-700/40 px-4 py-3 text-center text-xs text-emerald-50 sm:text-sm">
              Speech-to-Text and AI Writing Assist are <strong>separate</strong>.
              Subscribe to either, both, or neither.
            </p>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 1. Speech-to-Text Plans                                          */}
            {/* ───────────────────────────────────────────────────────────── */}
            <section>
              <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
                Speech-to-Text Plans
              </h2>
              <p className="mt-2 text-center text-sm text-emerald-50 sm:text-base">
                Free tier gives you 45 minutes of recording. Upgrade for more time:
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    planType="stt"
                    planId={plan.id}
                    name={plan.name}
                    priceGhs={plan.priceGhs}
                    priceUsd={plan.priceUsd}
                    currency={currency}
                    description={plan.description}
                    features={[
                      `${plan.durationLabel} of recording`,
                      `Valid for ${plan.validityLabel}`
                    ]}
                  />
                ))}
              </div>
            </section>

            {/* Divider */}
            <hr className="border-emerald-500/40" />

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 1b. Speech-to-Text Extra Minutes (GHS only, never expire)     */}
            {/* ───────────────────────────────────────────────────────────── */}
            {currency === "GHS" ? (
              <section>
                <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
                  Extra Minutes
                </h2>
                <p className="mt-2 text-center text-sm text-emerald-50 sm:text-base">
                  Need more recording time? Extra Minutes never expire and
                  stack with any plan. 15 GHS per hour.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {STT_TOPUP_PLANS.map((topup) => (
                    <TopUpCard key={topup.id} topup={topup} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* Divider */}
            <hr className="border-emerald-500/40" />

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 2. AI Writing Assist Plans                                       */}
            {/* ───────────────────────────────────────────────────────────── */}
            <section>
              <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
                AI Writing Assist Plans
              </h2>
              <p className="mt-2 text-center text-sm text-emerald-50 sm:text-base">
                Credits for Improve, Explain, Semantic Search & Ask Your
                Notes. Free starter grant is 60 credits.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {AI_SUBSCRIPTION_PLANS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    planType="ai"
                    planId={plan.id}
                    name={plan.name}
                    priceGhs={plan.priceGhs}
                    priceUsd={plan.priceUsd}
                    currency={currency}
                    description={plan.description}
                    features={[
                      `${plan.credits.toLocaleString()} AI credits`,
                      `Valid for ${plan.validityLabel}`
                    ]}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Plan card with Pay with Paystack button                                    */
/* -------------------------------------------------------------------------- */

type PlanCardProps = {
  planType: PlanType;
  planId: string;
  name: string;
  priceGhs: number;
  priceUsd: number;
  currency: PricingCurrency;
  description: string;
  features: string[];
};

function PlanCard({
  planType,
  planId,
  name,
  priceGhs,
  priceUsd,
  currency,
  description,
  features
}: PlanCardProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>({ state: "idle" });
  const [supportsApplePay, setSupportsApplePay] = useState(false);

  // Geo-based pricing: African visitors pay GHS, everyone else pays the fixed
  // USD equivalent. The same value is shown and charged; the server verifies
  // the amount/currency pair in assertAmountMatches (lib/paystack/server.ts).
  const planPrice = { priceGhs, priceUsd };
  const price = getPlanPrice(planPrice, currency);
  const display = formatPlanPrice(planPrice, currency);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applePayAvailable =
      "ApplePaySession" in window &&
      typeof window.ApplePaySession !== "undefined" &&
      (window.ApplePaySession.canMakePayments?.() ||
        window.ApplePaySession.canMakePaymentsWithActiveCard?.());

    setSupportsApplePay(Boolean(applePayAvailable));
  }, []);

  async function handlePay() {
    if (!user) {
      setStatus({
        state: "error",
        message: "Please sign in first to subscribe."
      });
      return;
    }

    setStatus({ state: "paying" });

    try {
      const result = await payAndVerify({
        email: user.email ?? "",
        amount: price,
        currency,
        metadata: {
          user_id: user.id,
          plan_type: planType,
          plan_id: planId as PaystackMetadata["plan_id"]
        }
      });

      setStatus({
        state: result.ok ? "success" : "error",
        message: result.message
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Payment failed. Please try again."
      });
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-emerald-400/50 bg-white/10 p-5 backdrop-blur-sm">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        <span className="text-2xl font-bold">{display}</span>
      </div>
      <p className="mt-2 text-sm text-emerald-50">{description}</p>
      <ul className="mt-3 space-y-1.5 text-sm text-emerald-50">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <span aria-hidden="true">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {/* Status messages */}
      {status.state === "success" ? (
        <div className="mt-4 rounded-lg bg-emerald-900/60 px-4 py-3 text-sm font-medium text-emerald-50">
          ✓ {status.message}
        </div>
      ) : null}
      {status.state === "error" ? (
        <div className="mt-4 rounded-lg bg-red-900/60 px-4 py-3 text-sm font-medium text-red-50">
          ✕ {status.message}
        </div>
      ) : null}

      {supportsApplePay ? (
        <button
          type="button"
          onClick={handlePay}
          disabled={status.state === "paying"}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            
          </span>
          {status.state === "paying" ? "Processing…" : `Pay ${display} with Apple Pay`}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (!supportsApplePay) {
            setStatus({
              state: "error",
              message:
                "Apple Pay is available in Safari on supported Apple devices. Use the Paystack option on this browser."
            });
            return;
          }
          void handlePay();
        }}
        disabled={status.state === "paying"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-black"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          
        </span>
        {status.state === "paying"
          ? "Processing…"
          : supportsApplePay
            ? `Pay ${display} with Apple Pay`
            : `Apple Pay unavailable on this browser`}
      </button>

      {!supportsApplePay ? (
        <p className="mt-2 text-center text-[11px] font-medium text-emerald-50/90">
          Apple Pay appears in Safari on supported Apple devices. Use Paystack on other browsers.
        </p>
      ) : null}

      {/* Pay with Paystack */}
      <button
        type="button"
        onClick={handlePay}
        disabled={status.state === "paying"}
        className="mt-3 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.state === "paying" ? "Processing…" : `Pay ${display} with Paystack`}
      </button>

    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Top-up card: Extra Minutes (Speech-to-Text, GHS only, never expire)        */
/* -------------------------------------------------------------------------- */

function TopUpCard({ topup }: { topup: (typeof STT_TOPUP_PLANS)[number] }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>({ state: "idle" });

  async function handlePay() {
    if (!user) {
      setStatus({
        state: "error",
        message: "Please sign in first."
      });
      return;
    }

    setStatus({ state: "paying" });

    try {
      const result = await payAndVerify({
        email: user.email ?? "",
        amount: topup.priceGhs,
        currency: "GHS",
        metadata: {
          user_id: user.id,
          plan_type: "stt_topup",
          plan_id: topup.id
        }
      });

      setStatus({
        state: result.ok ? "success" : "error",
        message: result.message
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Payment failed. Please try again."
      });
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-emerald-400/50 bg-white/10 p-4 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{topup.name}</h3>
        <span className="text-lg font-bold">{topup.priceGhs} GHS</span>
      </div>
      <span className="mt-2 w-fit rounded-full bg-emerald-900/60 px-2 py-0.5 text-[11px] font-medium text-emerald-50">
        Never expires
      </span>

      {status.state === "success" ? (
        <p className="mt-3 rounded-lg bg-emerald-900/60 px-3 py-2 text-xs font-medium text-emerald-50">
          ✓ {status.message}
        </p>
      ) : null}
      {status.state === "error" ? (
        <p className="mt-3 rounded-lg bg-red-900/60 px-3 py-2 text-xs font-medium text-red-50">
          ✕ {status.message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handlePay}
        disabled={status.state === "paying"}
        className="mt-3 w-full rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.state === "paying" ? "Processing…" : `Pay ${topup.priceGhs} GHS`}
      </button>
    </div>
  );
}
