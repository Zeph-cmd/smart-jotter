/**
 * Shared Paystack types — safe to import from BOTH client and server code.
 *
 * Kept separate from `server.ts` (which imports server-only env helpers and
 * Node crypto) so the client bundle never accidentally pulls in server code.
 */

import type {
  AiPlanId,
  PlanId,
  SttTopupId
} from "@/lib/config/plans";

/**
 * `metadata` object attached to every Paystack transaction we initialise.
 * This is how we know which plan to activate after a successful payment,
 * since Paystack does not know about our plan semantics.
 *
 *   plan_type: "stt"       -> Speech-to-Text plan (subscription_*)
 *   plan_type: "ai"        -> AI Writing Assist plan (ai_subscription_* / credits)
 *   plan_type: "stt_topup" -> Extra Minutes top-up (purchased_seconds_remaining,
 *                             never expires — not a subscription)
 */
export type PaystackMetadata = {
  user_id: string;
  plan_type: "stt" | "ai" | "stt_topup";
  plan_id: PlanId | AiPlanId | SttTopupId;
};