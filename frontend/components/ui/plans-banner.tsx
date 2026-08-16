"use client";

import { useEffect, useState } from "react";
import {
  AI_SUBSCRIPTION_PLANS,
  PAYMENT_CONTACT,
  SUBSCRIPTION_PLANS
} from "@/lib/config/plans";
import { useAuth } from "@/lib/auth/auth-context";
import { payWithPaystack } from "@/lib/paystack/client";
import type { PaystackMetadata } from "@/lib/paystack/types";

type PlanType = "stt" | "ai";

type PaymentStatus = {
  state: "idle" | "paying" | "success" | "error";
  message?: string;
};

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
 *   2. AI Writing Assist Plans — credits for Simplify/Improve/Explain/Search/Ask
 *      (ai_subscription_status)
 *
 * The two are independent purchases; a user can subscribe to either, both,
 * or neither. Both use the Paystack payment popup (instant activation), with
 * a manual MoMo + WhatsApp option as fallback.
 */
export function PlansBanner() {
  const [isExpanded, setIsExpanded] = useState(false);

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
                Free tier gives you 90 minutes of recording. Upgrade for more time:
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    planType="stt"
                    planId={plan.id}
                    name={plan.name}
                    priceGhs={plan.priceGhs}
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
            {/* 2. AI Writing Assist Plans                                       */}
            {/* ───────────────────────────────────────────────────────────── */}
            <section>
              <h2 className="text-center text-xl font-bold tracking-tight sm:text-2xl">
                AI Writing Assist Plans
              </h2>
              <p className="mt-2 text-center text-sm text-emerald-50 sm:text-base">
                Credits for Simplify, Improve, Explain, Semantic Search & Ask Your
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
  description: string;
  features: string[];
};

function PlanCard({
  planType,
  planId,
  name,
  priceGhs,
  description,
  features
}: PlanCardProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<PaymentStatus>({ state: "idle" });
  const [showMomo, setShowMomo] = useState(false);
  const [supportsApplePay, setSupportsApplePay] = useState(false);

  useEffect(() => {
    const applePayAvailable =
      typeof window !== "undefined" &&
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
      const metadata: PaystackMetadata = {
        user_id: user.id,
        plan_type: planType,
        plan_id: planId as PaystackMetadata["plan_id"]
      };

      // 1. Open the Paystack popup.
      const { reference } = await payWithPaystack({
        email: user.email ?? "",
        amountGhs: priceGhs,
        metadata
      });

      // 2. Verify server-side and activate entitlements.
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference })
      });

      const data = (await res.json()) as { success?: boolean; message?: string; error?: string };

      if (res.ok && data.success) {
        setStatus({
          state: "success",
          message: data.message ?? "Subscription activated successfully!"
        });
      } else {
        setStatus({
          state: "error",
          message: data.error ?? "Verification failed. If you were charged, please contact support."
        });
      }
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
        <span className="text-2xl font-bold">{priceGhs} GHS</span>
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
          onClick={async () => {
            if (!user) {
              setStatus({
                state: "error",
                message: "Please sign in first to subscribe."
              });
              return;
            }

            setStatus({ state: "paying" });

            try {
              const metadata: PaystackMetadata = {
                user_id: user.id,
                plan_type: planType,
                plan_id: planId as PaystackMetadata["plan_id"]
              };

              const { reference } = await payWithPaystack({
                email: user.email ?? "",
                amountGhs: priceGhs,
                metadata
              });

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
                setStatus({
                  state: "success",
                  message: data.message ?? "Subscription activated successfully!"
                });
              } else {
                setStatus({
                  state: "error",
                  message:
                    data.error ??
                    "Verification failed. If you were charged, please contact support."
                });
              }
            } catch (error) {
              setStatus({
                state: "error",
                message:
                  error instanceof Error ? error.message : "Payment failed. Please try again."
              });
            }
          }}
          disabled={status.state === "paying"}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            
          </span>
          {status.state === "paying" ? "Processing…" : `Pay ${priceGhs} GHS with Apple Pay`}
        </button>
      ) : null}

      {/* Pay with Paystack */}
      <button
        type="button"
        onClick={handlePay}
        disabled={status.state === "paying"}
        className="mt-3 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status.state === "paying" ? "Processing…" : `Pay ${priceGhs} GHS with Paystack`}
      </button>

      {/* MoMo fallback toggle */}
      <button
        type="button"
        onClick={() => setShowMomo((v) => !v)}
        className="mt-3 text-center text-xs text-emerald-100 underline hover:text-white"
      >
        Prefer to pay via Mobile Money instead?
      </button>

      {showMomo ? <MoMoInstructions /> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MoMo + WhatsApp fallback instructions (collapsible)                        */
/* -------------------------------------------------------------------------- */

function MoMoInstructions() {
  return (
    <div className="mt-3 rounded-2xl border border-emerald-400/40 bg-emerald-700/50 p-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide">
        Manual Mobile Money payment
      </h3>
      <ol className="mt-3 space-y-2 text-sm text-emerald-50">
        <li className="flex gap-2">
          <span className="font-bold">1.</span>
          <span>
            Send to{" "}
            <span className="font-semibold">
              {PAYMENT_CONTACT.momoNetwork} MoMo {PAYMENT_CONTACT.momoNumber}
            </span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">2.</span>
          <span>
            Registered name:{" "}
            <span className="font-semibold">{PAYMENT_CONTACT.registeredName}</span>
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">3.</span>
          <span>Screenshot the confirmation message</span>
        </li>
        <li className="flex gap-2">
          <span className="font-bold">4.</span>
          <span>
            Send it to{" "}
            <a
              href={`https://wa.me/${PAYMENT_CONTACT.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              WhatsApp {PAYMENT_CONTACT.whatsappNumber}
            </a>{" "}
            with the plan name
          </span>
        </li>
      </ol>
      <p className="mt-3 text-xs text-emerald-100">
        Activation is manual — you'll be unlocked shortly after sending the
        screenshot.
      </p>
    </div>
  );
}