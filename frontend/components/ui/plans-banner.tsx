"use client";

import { useState } from "react";
import {
  AI_SUBSCRIPTION_PLANS,
  PAYMENT_CONTACT,
  SUBSCRIPTION_PLANS
} from "@/lib/config/plans";

/**
 * A green banner shown app-wide. When clicked, it expands to reveal the two
 * SEPARATE subscription tracks:
 *
 *   1. Speech-to-Text Plans  — recording time (subscription_status)
 *   2. AI Writing Assist Plans — credits for Simplify/Improve/Explain/Search/Ask
 *      (ai_subscription_status)
 *
 * The two are independent purchases; a user can subscribe to either, both,
 * or neither. Both reuse the same MoMo + WhatsApp manual payment flow.
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

              {/* Plan cards */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-emerald-400/50 bg-white/10 p-5 backdrop-blur-sm"
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <span className="text-2xl font-bold">{plan.priceGhs} GHS</span>
                    </div>
                    <p className="mt-2 text-sm text-emerald-50">{plan.description}</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-emerald-50">
                      <li className="flex items-center gap-2">
                        <span aria-hidden="true">✓</span>
                        {plan.durationLabel} of recording
                      </li>
                      <li className="flex items-center gap-2">
                        <span aria-hidden="true">✓</span>
                        Valid for {plan.validityLabel}
                      </li>
                    </ul>
                  </div>
                ))}
              </div>

              {/* Payment instructions */}
              <PaymentInstructions
                label="Speech-to-Text"
                amounts={SUBSCRIPTION_PLANS.map((p) => p.priceGhs)}
              />
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

              {/* Plan cards */}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {AI_SUBSCRIPTION_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-2xl border border-emerald-400/50 bg-white/10 p-5 backdrop-blur-sm"
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <span className="text-2xl font-bold">{plan.priceGhs} GHS</span>
                    </div>
                    <p className="mt-2 text-sm text-emerald-50">{plan.description}</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-emerald-50">
                      <li className="flex items-center gap-2">
                        <span aria-hidden="true">✓</span>
                        {plan.credits.toLocaleString()} AI credits
                      </li>
                      <li className="flex items-center gap-2">
                        <span aria-hidden="true">✓</span>
                        Valid for {plan.validityLabel}
                      </li>
                    </ul>
                  </div>
                ))}
              </div>

              {/* Payment instructions */}
              <PaymentInstructions
                label="AI Writing Assist"
                amounts={AI_SUBSCRIPTION_PLANS.map((p) => p.priceGhs)}
              />
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Shared MoMo + WhatsApp payment instructions block. `label` and `amounts`
 * tailor the copy so the user states which plan (and amount) they're paying for.
 */
function PaymentInstructions({
  label,
  amounts
}: {
  label: string;
  amounts: number[];
}) {
  const amountList = amounts.map((a) => `${a} GHS`).join(" or ");

  return (
    <div className="mt-5 rounded-2xl border border-emerald-400/40 bg-emerald-700/50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide">
        How to pay — {label}
      </h3>
      <ol className="mt-3 space-y-2 text-sm text-emerald-50">
        <li className="flex gap-2">
          <span className="font-bold">1.</span>
          <span>
            Send {amountList} to{" "}
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
            and mention which {label} plan you paid for
          </span>
        </li>
      </ol>
      <p className="mt-4 text-xs text-emerald-100">
        Activation is manual — you'll be unlocked shortly after sending the
        screenshot.
      </p>
    </div>
  );
}