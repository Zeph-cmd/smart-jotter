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
 *   credits_allotted         = plan.credits (3000 or 6000)
 *   ai_subscription_status   = 'active'
 *   ai_subscription_expiry   = today + plan.validityDays
 */
export const AI_SUBSCRIPTION_PLANS: AiSubscriptionPlan[] = [
  {
    id: "ai_plan_a",
    name: "AI Plan A",
    priceGhs: 50,
    credits: 3000,
    validityDays: 7,
    validityLabel: "1 week",
    description: "3,000 AI credits — enough for a busy week of writing assists."
  },
  {
    id: "ai_plan_b",
    name: "AI Plan B",
    priceGhs: 100,
    credits: 6000,
    validityDays: 30,
    validityLabel: "1 month",
    description: "6,000 AI credits — best value for heavy daily use."
  }
];

/**
 * Developer payment contact details. Shown to users in the manual payment flow.
 */
export const PAYMENT_CONTACT = {
  /** Mobile-money network the MoMo number is registered on. */
  momoNetwork: "MTN",
  /** MoMo number payments are sent to. */
  momoNumber: "0257711831",
  /** Registered name for the MoMo account. */
  registeredName: "Dopaak Yumpini Zephaniah",
  /** WhatsApp number screenshots are sent to. */
  whatsappNumber: "0257711831"
} as const;
