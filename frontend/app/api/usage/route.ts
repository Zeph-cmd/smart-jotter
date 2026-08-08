import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { getAiCredits, getUsageByFeature } from "@/lib/ai/credits";
import { FEATURE_CREDIT_COSTS, FEATURE_LABELS, type AiFeature } from "@/lib/credits";

/**
 * GET /api/usage — returns the signed-in user's AI credit balance, subscription
 * info, and per-feature usage totals for the /usage page.
 *
 * DORMANT: this only reads data; actual AI calls remain disabled behind
 * FEATURES_ENABLED. The page works with zero rows (defaults to 0s).
 */
export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    const [credits, usageByFeature] = await Promise.all([
      getAiCredits(supabase, userId),
      getUsageByFeature(supabase, userId)
    ]);

    // Build a stable, full table of every feature (even those with 0 usage)
    // so the usage page table never has missing rows.
    const allFeatures = Object.keys(FEATURE_CREDIT_COSTS) as AiFeature[];
    const usageByFeatureMap = new Map(
      usageByFeature.map((row) => [row.feature, row.total_credits])
    );

    const featureRows = allFeatures.map((feature) => ({
      feature,
      label: FEATURE_LABELS[feature],
      creditsUsed: usageByFeatureMap.get(feature) ?? 0
    }));

    return NextResponse.json({
      planName: credits.ai_subscription_status === "active" ? "AI Writing Assist plan" : "Free starter",
      subscriptionStatus: credits.ai_subscription_status,
      subscriptionExpiry: credits.ai_subscription_expiry,
      creditsAllotted: credits.credits_allotted,
      creditsUsed: credits.credits_used,
      creditsRemaining: credits.remaining,
      featureRows
    });
  } catch (error) {
    return handleRouteError(
      "api-usage-get",
      error,
      "Could not load your usage."
    );
  }
}