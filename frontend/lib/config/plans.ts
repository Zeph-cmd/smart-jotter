/**
 * Subscription plan definitions for Smart Jotter.
 *
 * These are the manual (no payment-gateway) plans. The developer confirms
 * payment via WhatsApp, then sets the entitlement columns directly in
 * Supabase's table editor.
 *
 * There are TWO independent subscription tracks:
 *   1. Speech-to-Text Plans  -> subscription_status / subscription_expiry
 *   2. AI Writing Assist Plans -> ai_subscription_status / ai_subscription_expiry
 *
 * A user can subscribe to either, both, or neither. The two are never bundled.
 */

/* -------------------------------------------------------------------------- */
/* 1. Speech-to-Text Plans (recording time)                                   */
/* -------------------------------------------------------------------------- */

export type PlanId = "plan_a" | "plan_b";

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  priceGhs: number;
  /** USD equivalent charged to users outside Africa (fixed rate). */
  priceUsd: number;
  /** Duration the plan grants, in seconds. */
  durationSeconds: number;
  /** Human-readable duration (e.g. "4 hours"). */
  durationLabel: string;
  /** Validity window of the plan, in days. */
  validityDays: number;
  /** Human-readable validity (e.g. "1 week"). */
  validityLabel: string;
  description: string;
};

/**
 * Speech-to-Text plans. These govern recording time only and map to the
 * `subscription_status` / `subscription_expiry` columns.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan_a",
    name: "Plan A",
    priceGhs: 50,
    priceUsd: 20,
    durationSeconds: 4 * 60 * 60, // 4 hours
    durationLabel: "4 hours",
    validityDays: 7,
    validityLabel: "1 week",
    description: "Great for a busy week of lectures or meetings."
  },
  {
    id: "plan_b",
    name: "Plan B",
    priceGhs: 100,
    priceUsd: 40,
    durationSeconds: 8 * 60 * 60, // 8 hours
    durationLabel: "8 hours",
    validityDays: 30,
    validityLabel: "1 month",
    description: "Best value for power users recording daily."
  }
];
/* -------------------------------------------------------------------------- */
/* 2. AI Writing Assist Plans (credits for Improve/Explain/Search/Ask) */
/* -------------------------------------------------------------------------- */

export type AiPlanId = "ai_plan_a" | "ai_plan_b";

export type AiSubscriptionPlan = {
  id: AiPlanId;
  name: string;
  priceGhs: number;
  /** USD equivalent charged to users outside Africa (fixed rate). */
  priceUsd: number;
  /** Total AI credits this plan grants. */
  credits: number;
  /** Validity window of the plan, in days. */
  validityDays: number;
  /** Human-readable validity (e.g. "1 week"). */
  validityLabel: string;
  description: string;
};

/**
 * AI Writing Assist plans. These grant credits for the AI text features
 * (Improve, Explain, Semantic Search, Ask Your Notes) and map to the
 * `ai_subscription_status` / `ai_subscription_expiry` columns.
 *
 * Manual activation (via Supabase table editor) sets:
 *   credits_allotted         = plan.credits (100 or 200)
 *   ai_subscription_status   = 'active'
 *   ai_subscription_expiry   = today + plan.validityDays
 */
export const AI_SUBSCRIPTION_PLANS: AiSubscriptionPlan[] = [
  {
    id: "ai_plan_a",
    name: "AI Plan A",
    priceGhs: 50,
    priceUsd: 20,
    credits: 100,
    validityDays: 7,
    validityLabel: "1 week",
    description: "100 AI credits — enough for a busy week of writing assists."
  },
  {
    id: "ai_plan_b",
    name: "AI Plan B",
    priceGhs: 100,
    priceUsd: 40,
    credits: 200,
    validityDays: 30,
    validityLabel: "1 month",
    description: "200 AI credits — best value for heavy daily use."
  }
];

/* -------------------------------------------------------------------------- */
/* 3. Speech-to-Text Extra Minutes top-ups (never expire)                     */
/* -------------------------------------------------------------------------- */

export type SttTopupId =
  | "stt_topup_1h"
  | "stt_topup_2h"
  | "stt_topup_3h"
  | "stt_topup_4h"
  | "stt_topup_5h"
  | "stt_topup_6h"
  | "stt_topup_7h"
  | "stt_topup_8h"
  | "stt_topup_9h"
  | "stt_topup_10h";

export type SttTopupPlan = {
  id: SttTopupId;
  name: string;
  /** Hours of recording time granted. */
  hours: number;
  /** Duration the top-up grants, in seconds. */
  seconds: number;
  /** Price in Ghana cedis. */
  priceGhs: number;
  /** USD equivalent charged to users outside Africa (fixed rate). */
  priceUsd: number;
  description: string;
};

/**
 * Extra Minutes top-ups for Speech-to-Text: 15 GHS per hour (6 USD per hour
 * outside Africa), 1–10 hours. Purchased minutes NEVER expire and stack with
 * any plan. They are consumed after active plan minutes but before the free
 * lifetime allowance.
 */
export const STT_TOPUP_PLANS: SttTopupPlan[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(
  (hours) => ({
    id: `stt_topup_${hours}h` as SttTopupId,
    name: `${hours} hour${hours > 1 ? "s" : ""}`,
    hours,
    seconds: hours * 60 * 60,
    priceGhs: hours * 15,
    priceUsd: hours * 6,
    description: "Never expires. Stacks with any plan."
  })
);

/* -------------------------------------------------------------------------- */
/* Geo-based pricing helpers                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Currency shown to / charged from the current visitor.
 *  - "GHS": visitors in Africa (primary market, Paystack Ghana).
 *  - "USD": visitors anywhere else (fixed rate — no live FX).
 */
export type PricingCurrency = "GHS" | "USD";

/** Returns the price (in major units) for a plan in the given currency. */
export function getPlanPrice(
  plan: { priceGhs: number; priceUsd: number },
  currency: PricingCurrency
): number {
  return currency === "USD" ? plan.priceUsd : plan.priceGhs;
}

/** Formats a plan price for display, e.g. "50 GHS" or "$20 USD". */
export function formatPlanPrice(
  plan: { priceGhs: number; priceUsd: number },
  currency: PricingCurrency
): string {
  return currency === "USD" ? `$${plan.priceUsd} USD` : `${plan.priceGhs} GHS`;
}

