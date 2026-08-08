/**
 * AI credit gating logic for Smart Jotter.
 *
 * Before any of the 5 AI features run, we check the user's credit balance.
 * After a successful AI call, we increment credits_used and log a row.
 *
 * This module is modelled on lib/ai/entitlements.ts (the audio quota system)
 * but tracks discrete "credits" instead of seconds. It reads/writes the same
 * sj_user_entitlements row plus the new sj_ai_usage_log table.
 *
 * ACTIVE: FEATURES_ENABLED is on (see lib/config/features.ts), so the
 * routes call enforceCredits() before each AI call and recordAiUsage() after.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/server/errors";
import { getFeatureCost, type AiFeature } from "@/lib/credits";

export type AiCredits = {
  credits_allotted: number;
  credits_used: number;
  remaining: number;
  /** Status of the AI Writing Assist subscription (separate from speech-to-text). */
  ai_subscription_status: "none" | "active" | "expired";
  /** Date the AI plan lapses (null = no plan activated yet). */
  ai_subscription_expiry: string | null;
};

type EntitlementsCreditRow = {
  credits_allotted: number | null;
  credits_used: number | null;
  ai_subscription_status: "none" | "active" | "expired" | null;
  ai_subscription_expiry: string | null;
};

/**
 * Reads the user's credit balance, defaulting to 0 for first-time users
 * (the entitlements row may not exist yet).
 */
export async function getAiCredits(
  supabase: SupabaseClient,
  userId: string
): Promise<AiCredits> {
  const { data, error } = await supabase
    .from("sj_user_entitlements")
    .select(
      "credits_allotted, credits_used, ai_subscription_status, ai_subscription_expiry"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load AI credits: ${error.message}`);
  }

  const row = (data ?? null) as EntitlementsCreditRow | null;
  const allotted = row?.credits_allotted ?? 0;
  const used = row?.credits_used ?? 0;

  return {
    credits_allotted: allotted,
    credits_used: used,
    remaining: Math.max(0, allotted - used),
    ai_subscription_status: row?.ai_subscription_status ?? "none",
    ai_subscription_expiry: row?.ai_subscription_expiry ?? null
  };
}

/**
 * Returns true if the user has a valid, non-expired AI Writing Assist
 * subscription (ai_subscription_status = 'active' and the expiry date is in
 * the future). This is SEPARATE from the speech-to-text subscription.
 */
export function isAiSubscriptionActive(credits: AiCredits): boolean {
  if (credits.ai_subscription_status !== "active") {
    return false;
  }

  if (!credits.ai_subscription_expiry) {
    return false;
  }

  // Expiry is a DATE (no time component). Treat the plan as valid up to the
  // end of its expiry day.
  const expiry = new Date(`${credits.ai_subscription_expiry}T23:59:59`);
  return expiry.getTime() > Date.now();
}

/**
 * Enforces that the user can use the requested AI feature.
 *
 * Access is granted when EITHER is true:
 *   1. The user has an ACTIVE, non-expired AI Writing Assist subscription
 *      (ai_subscription_status = 'active' + ai_subscription_expiry in the
 *      future) AND has remaining credits (credits_used < credits_allotted).
 *   2. The user is still within their free starter credits
 *      (credits_used + cost <= credits_allotted, where the default
 *      credits_allotted of 60 is the free grant).
 *
 * Once the subscription expires OR credits are exhausted, this throws an
 * ApiError (402) that the UI surfaces as the "upgrade" prompt pointing to the
 * AI Writing Assist Plans section.
 *
 * @returns The credit cost that will be charged on success (used by
 *          recordAiUsage to avoid a second lookup).
 */
export async function enforceCredits(
  supabase: SupabaseClient,
  userId: string,
  feature: AiFeature
): Promise<number> {
  const credits = await getAiCredits(supabase, userId);
  const cost = getFeatureCost(feature);

  const hasActiveSubscription = isAiSubscriptionActive(credits);
  const withinCreditAllowance =
    credits.credits_used + cost <= credits.credits_allotted;

  if (!withinCreditAllowance) {
    throw new ApiError(
      "You've used all your AI credits. Upgrade your AI Writing Assist plan to continue.",
      402
    );
  }

  // If they're using a paid AI plan, it must still be active. The only time we
  // allow usage without an active subscription is when the user is still within
  // the free starter credits (credits_allotted equals the free grant of 60 and
  // no plan has been activated).
  if (!hasActiveSubscription && credits.ai_subscription_status !== "none") {
    throw new ApiError(
      "Your AI Writing Assist plan has expired. Renew your plan to continue using AI features.",
      402
    );
  }

  return cost;
}

/**
 * Records usage after a successful AI call:
 *  1. Increments credits_used on sj_user_entitlements.
 *  2. Inserts a row into sj_ai_usage_log with the feature and cost.
 *
 * Both calls are best-effort after the AI work has already succeeded — a
 * failure here is logged but does not undo the user's result.
 */
export async function recordAiUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: AiFeature,
  cost: number
): Promise<void> {
  if (cost <= 0) {
    return;
  }

  const { error: incrementError } = await supabase.rpc("increment_credits_used", {
    input_user_id: userId,
    input_credits: cost
  });

  if (incrementError) {
    // Log but don't throw — the AI result already succeeded.
    console.error(
      "[smart-jotter]",
      JSON.stringify({
        scope: "record-ai-usage-increment",
        error: incrementError.message,
        userId,
        feature
      })
    );
  }

  const { error: logError } = await supabase.from("sj_ai_usage_log").insert({
    user_id: userId,
    feature,
    credits_used: cost
  });

  if (logError) {
    console.error(
      "[smart-jotter]",
      JSON.stringify({
        scope: "record-ai-usage-log",
        error: logError.message,
        userId,
        feature
      })
    );
  }
}

/**
 * Convenience wrapper: gate + return a handle that records usage on success.
 * Usage in a route:
 *   const cost = await enforceCredits(supabase, userId, "simplify");
 *   const result = await runAiCall();
 *   await recordAiUsage(supabase, userId, "simplify", cost);
 *   return result;
 */

/**
 * Aggregated usage per feature for the usage page. Returns rows of
 * { feature, total_credits }.
 */
export type FeatureUsageRow = {
  feature: string;
  total_credits: number;
};

export async function getUsageByFeature(
  supabase: SupabaseClient,
  userId: string
): Promise<FeatureUsageRow[]> {
  const { data, error } = await supabase
    .from("sj_ai_usage_log")
    .select("feature, credits_used")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Could not load AI usage log: ${error.message}`);
  }

  const rows = (data as { feature: string; credits_used: number }[] | null) ?? [];

  // Group + sum in JS (small dataset per user).
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.feature, (totals.get(row.feature) ?? 0) + row.credits_used);
  }

  return Array.from(totals.entries()).map(([feature, total_credits]) => ({
    feature,
    total_credits
  }));
}