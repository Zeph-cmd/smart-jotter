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
 * DORMANT: Actual OpenAI calls stay disabled behind FEATURES_ENABLED. The
 * routes import these helpers now so flipping the flag later "just works".
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/server/errors";
import { getFeatureCost, type AiFeature } from "@/lib/credits";

export type AiCredits = {
  credits_allotted: number;
  credits_used: number;
  remaining: number;
};

type EntitlementsCreditRow = {
  credits_allotted: number | null;
  credits_used: number | null;
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
    .select("credits_allotted, credits_used")
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
    remaining: Math.max(0, allotted - used)
  };
}

/**
 * Enforces that the user has enough credits for the requested feature.
 * Throws an ApiError (402) if they would exceed their allowance.
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

  if (credits.credits_used + cost > credits.credits_allotted) {
    throw new ApiError(
      "You've used all your credits. Upgrade your plan to continue.",
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