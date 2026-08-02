"use client";

import { useEffect } from "react";
import { PAYMENT_CONTACT, SUBSCRIPTION_PLANS } from "@/lib/config/plans";

type SubscriptionPromptProps = {
  /** Whether the modal/prompt is visible. */
  isOpen: boolean;
  /** Called when the user dismisses the prompt. */
  onClose: () => void;
  /** Optional heading override. */
  title?: string;
};

/**
 * Manual payment flow shown when a user hits their free-tier or subscription
 * audio limit. Displays the two plans, MoMo instructions, and WhatsApp
 * confirmation steps. No in-app payment is processed — the developer activates
 * the subscription manually in Supabase after confirming payment.
 */
export function SubscriptionPrompt({
  isOpen,
  onClose,
  title = "You've reached your recording limit"
}: SubscriptionPromptProps) {
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
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Upgrade to keep recording with speech-to-text.
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

        {/* Plan cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-2xl border border-line bg-slate-50 p-5 dark:bg-slate-950"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-ink dark:text-slate-100">
                  {plan.name}
                </h3>
                <span className="text-2xl font-bold text-accent">
                  {plan.priceGhs} GHS
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
          ))}
        </div>

        {/* Payment instructions */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-500/30 dark:bg-blue-500/10">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            How to activate
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>
                Send your chosen amount to{" "}
                <span className="font-semibold">MoMo {PAYMENT_CONTACT.momoNumber}</span>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Screenshot the confirmation message</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
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
                for activation
              </span>
            </li>
          </ol>
          <p className="mt-4 text-xs text-blue-700 dark:text-blue-300">
            Registered name: {PAYMENT_CONTACT.registeredName}. Activation is
            manual — you'll be unlocked shortly after sending the screenshot.
          </p>
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