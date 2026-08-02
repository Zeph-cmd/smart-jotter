/**
 * Subscription plan definitions for Smart Jotter.
 *
 * These are the manual (no payment-gateway) plans. The developer confirms
 * payment via WhatsApp, then sets the entitlement columns directly in
 * Supabase's table editor.
 */

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

/**
 * Developer payment contact details. Shown to users in the manual payment flow.
 */
export const PAYMENT_CONTACT = {
  /** MoMo number payments are sent to. */
  momoNumber: "0257711831",
  /** Registered name for the MoMo account. */
  registeredName: "Dopaak Yumpini Zephaniah",
  /** WhatsApp number screenshots are sent to. */
  whatsappNumber: "0257711831"
} as const;