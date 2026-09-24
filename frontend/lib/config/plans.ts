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
/* 2. AI Writing Assist Plans (credits for Simplify/Improve/Explain/Search/Ask) */
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
 * (Simplify, Improve, Explain, Semantic Search, Ask Your Notes) and map to the
 * `ai_subscription_status` / `ai_subscription_expiry` columns.
 *
 * Manual activation (via Supabase table editor) sets:
 *   credits_allotted         = plan.credits (200 or 400)
 *   ai_subscription_status   = 'active'
 *   ai_subscription_expiry   = today + plan.validityDays
 */
export const AI_SUBSCRIPTION_PLANS: AiSubscriptionPlan[] = [
  {
    id: "ai_plan_a",
    name: "AI Plan A",
    priceGhs: 50,
    priceUsd: 20,
    credits: 200,
    validityDays: 7,
    validityLabel: "1 week",
    description: "200 AI credits — enough for a busy week of writing assists."
  },
  {
    id: "ai_plan_b",
    name: "AI Plan B",
    priceGhs: 100,
    priceUsd: 40,
    credits: 400,
    validityDays: 30,
    validityLabel: "1 month",
    description: "400 AI credits — best value for heavy daily use."
  }
];

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

