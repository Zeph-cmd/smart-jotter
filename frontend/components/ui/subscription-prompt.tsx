"use client";

import { useEffect } from "react";
import {
  AI_SUBSCRIPTION_PLANS,
  SUBSCRIPTION_PLANS,
  formatPlanPrice,
  type AiSubscriptionPlan,
  type PricingCurrency,
  type SubscriptionPlan
} from "@/lib/config/plans";
import { usePricingCurrency } from "@/lib/pricing/use-currency";

type SubscriptionPromptProps = {
  /** Whether the modal/prompt is visible. */
  isOpen: boolean;
  /** Called when the user dismisses the prompt. */
  onClose: () => void;
  /** Optional heading override. */
  title?: string;
  /**
   * Which track of plans to display. "speech" (default) shows the recording
   * time plans; "ai" shows the AI Writing Assist credit plans.
   */
  variant?: "speech" | "ai";
};

/**
 * Subscription options shown when a user hits their free-tier or subscription
 * limit. Two variants share the same plan display:
 *   - "speech": Speech-to-Text recording-time plans
 *   - "ai": AI Writing Assist credit plans (Simplify/Improve/Explain/Search/Ask)
 *
 * Payment is handled through the Paystack checkout in the plans banner.
 */
export function SubscriptionPrompt({
  isOpen,
  onClose,
  title,
  variant = "speech"
}: SubscriptionPromptProps) {
  const isAi = variant === "ai";
  const currency: PricingCurrency = usePricingCurrency();

  const heading =
    title ??
    (isAi
      ? "You're out of AI credits"
      : "You've reached your recording limit");

  const subtitle = isAi
    ? "Upgrade your AI Writing Assist plan to keep using Smart Jotter's AI features."
    : "Upgrade to keep recording with speech-to-text.";

  // Close on Escape key.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-prompt-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] border border-line bg-white p-6 shadow-2xl dark:bg-slate-900 sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="subscription-prompt-title"
              className="text-2xl font-semibold text-ink dark:text-slate-100"
            >
              {heading}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Section label for the relevant track */}
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          {isAi ? "AI Writing Assist Plans" : "Speech-to-Text Plans"}
        </p>

        {/* Plan cards */}
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {isAi
            ? AI_SUBSCRIPTION_PLANS.map((plan) => (
                <AiPlanCard key={plan.id} plan={plan} currency={currency} />
              ))
            : SUBSCRIPTION_PLANS.map((plan) => (
                <SpeechPlanCard key={plan.id} plan={plan} currency={currency} />
              ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function SpeechPlanCard({
  plan,
  currency
}: {
  plan: SubscriptionPlan;
  currency: PricingCurrency;
}) {
  return (
    <div className="rounded-2xl border border-line bg-slate-50 p-5 dark:bg-slate-950">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-ink dark:text-slate-100">
          {plan.name}
        </h3>
        <span className="text-2xl font-bold text-accent">
          {formatPlanPrice(plan, currency)}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {plan.description}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          {plan.durationLabel} of recording
        </li>
        <li className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          Valid for {plan.validityLabel}
        </li>
      </ul>
    </div>
  );
}

function AiPlanCard({
  plan,
  currency
}: {
  plan: AiSubscriptionPlan;
  currency: PricingCurrency;
}) {
  return (
    <div className="rounded-2xl border border-line bg-slate-50 p-5 dark:bg-slate-950">
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-ink dark:text-slate-100">
          {plan.name}
        </h3>
        <span className="text-2xl font-bold text-accent">
          {formatPlanPrice(plan, currency)}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {plan.description}
      </p>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
        <li className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          {plan.credits.toLocaleString()} AI credits
        </li>
        <li className="flex items-center gap-2">
          <span className="text-accent">✓</span>
          Valid for {plan.validityLabel}
        </li>
      </ul>
    </div>
  );
}