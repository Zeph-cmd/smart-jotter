import type { AppSupabaseClient } from "@/lib/supabase/types";
import { ApiError } from "@/lib/server/errors";

/**
 * Free-tier cap: 45 minutes = 2,700 seconds of total transcription time.
 * This is a one-time lifetime allowance (not monthly) until the user subscribes.
 */
export const FREE_TIER_LIMIT_SECONDS = 45 * 60; // 2700

/**
 * Maximum duration of a single continuous recording. 30 minutes = 1,800
 * seconds. Enforced client-side by the voice recorder hook.
 */
export const MAX_RECORDING_SECONDS = 30 * 60;

export type SubscriptionStatus = "none" | "active" | "expired";

export type UserEntitlements = {
  usage_seconds: number;
  subscription_status: SubscriptionStatus;
  subscription_expiry: string | null;
  subscription_minutes_allotted: number;
  subscription_minutes_used: number;
  purchased_seconds_remaining: number;
};

export type AccessTier = "free" | "subscription" | "purchased";

export type AudioAccess = {
  /** Current tier being evaluated. */
  tier: AccessTier;
  /** Whether the user is allowed to record right now. */
  canRecord: boolean;
  /** Seconds used against the current cap. */
  usedSeconds: number;
  /** Total seconds allowed for the current tier. */
  limitSeconds: number;
  /** Seconds remaining in the current tier. */
  remainingSeconds: number;
  /** True if the subscription has passed its expiry date. */
  subscriptionExpired: boolean;
};

type EntitlementsRow = {
  usage_seconds: number | null;
  subscription_status: SubscriptionStatus | null;
  subscription_expiry: string | null;
  subscription_minutes_allotted: number | null;
  subscription_minutes_used: number | null;
  purchased_seconds_remaining: number | null;
};

/**
 * Fetches the user's entitlements row, defaulting to zeroed values if the
 * row doesn't exist yet (first-time user).
 *
 * Lazy expiry normalization: if the STT plan is marked active but its expiry
 * has passed, the plan (and any unused plan minutes) is terminated
 * immediately — unused plan time does not roll over on any plan. The change
 * is written back best-effort so the Usage page reflects the real state.
 */
export async function getEntitlements(
  supabase: AppSupabaseClient,
  userId: string
): Promise<UserEntitlements> {
  const { data, error } = await supabase
    .from("sj_user_entitlements")
    .select(
      "usage_seconds, subscription_status, subscription_expiry, subscription_minutes_allotted, subscription_minutes_used, purchased_seconds_remaining"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load entitlements: ${error.message}`);
  }

  const row: Partial<EntitlementsRow> = (data as EntitlementsRow | null) ?? {};

  const result: UserEntitlements = {
    usage_seconds: row.usage_seconds ?? 0,
    subscription_status: row.subscription_status ?? "none",
    subscription_expiry: row.subscription_expiry ?? null,
    subscription_minutes_allotted: row.subscription_minutes_allotted ?? 0,
    subscription_minutes_used: row.subscription_minutes_used ?? 0,
    purchased_seconds_remaining: row.purchased_seconds_remaining ?? 0
  };

  // Terminate an expired STT plan: unused plan minutes are lost (no rollover).
  if (
    result.subscription_status === "active" &&
    result.subscription_expiry &&
    new Date(result.subscription_expiry).getTime() <= Date.now()
  ) {
    result.subscription_status = "expired";
    result.subscription_minutes_allotted = 0;

    const { error: normalizeError } = await supabase
      .from("sj_user_entitlements")
      .update({
        subscription_status: "expired",
        subscription_minutes_allotted: 0,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId);

    if (normalizeError) {
      console.error(
        "[smart-jotter]",
        JSON.stringify({
          scope: "stt-plan-expiry-normalize",
          error: normalizeError.message,
          userId
        })
      );
    }
  }

  return result;
}

/**
 * Returns the current audio access state for the user, evaluating whether the
 * subscription is still valid and which cap applies.
 */
export async function getAudioAccess(
  supabase: AppSupabaseClient,
  userId: string
): Promise<AudioAccess> {
  const entitlements = await getEntitlements(supabase, userId);

  return evaluateAccess(entitlements);
}

/**
 * Evaluates access purely from an entitlements object (no DB call). Useful for
 * keeping the DB-query and enforcement paths consistent.
 *
 * Consumption order: active plan minutes first (they expire), then purchased
 * top-up minutes (never expire, paid), then the free lifetime allowance.
 */
export function evaluateAccess(entitlements: UserEntitlements): AudioAccess {
  const now = new Date();
  const expiryDate = entitlements.subscription_expiry
    ? new Date(entitlements.subscription_expiry)
    : null;

  const subscriptionExpired =
    entitlements.subscription_status !== "active" ||
    (expiryDate !== null && expiryDate.getTime() <= now.getTime());

  // 1. Active subscription takes precedence.
  if (entitlements.subscription_status === "active" && !subscriptionExpired) {
    const limitSeconds = entitlements.subscription_minutes_allotted * 60;
    const usedSeconds = Math.round(entitlements.subscription_minutes_used * 60);
    const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);

    return {
      tier: "subscription",
      canRecord: remainingSeconds > 0,
      usedSeconds,
      limitSeconds,
      remainingSeconds,
      subscriptionExpired: false
    };
  }

  // 2. Purchased top-up minutes (never expire).
  const purchasedRemaining = Math.max(0, entitlements.purchased_seconds_remaining);
  if (purchasedRemaining > 0) {
    return {
      tier: "purchased",
      canRecord: true,
      usedSeconds: 0,
      limitSeconds: purchasedRemaining,
      remainingSeconds: purchasedRemaining,
      subscriptionExpired
    };
  }

  // 3. Free tier.
  const usedSeconds = entitlements.usage_seconds;
  const limitSeconds = FREE_TIER_LIMIT_SECONDS;
  const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);

  return {
    tier: "free",
    canRecord: remainingSeconds > 0,
    usedSeconds,
    limitSeconds,
    remainingSeconds,
    subscriptionExpired
  };
}

/**
 * Ensures the user has enough remaining quota for the requested duration.
 * Throws an ApiError (402) if the limit would be exceeded.
 */
export async function enforceAudioQuota(
  supabase: AppSupabaseClient,
  userId: string,
  requestedSeconds: number
): Promise<AudioAccess> {
  const access = await getAudioAccess(supabase, userId);

  if (requestedSeconds > access.remainingSeconds || !access.canRecord) {
    const tierLabel =
      access.tier === "subscription"
        ? "Subscription"
        : access.tier === "purchased"
          ? "Extra-minutes"
          : "Free-tier";
    throw new ApiError(
      `${tierLabel} audio limit reached. You have ${formatDuration(
        access.remainingSeconds
      )} left. Upgrade to a plan or buy extra minutes to continue recording.`,
      402
    );
  }

  return access;
}

/**
 * Records usage after a successful transcription. Routes the increment to the
 * correct bucket based on the current active tier:
 *   subscription -> plan minutes (expiring)
 *   purchased    -> purchased top-up seconds (never expire)
 *   free         -> free lifetime allowance
 */
export async function recordAudioUsage(
  supabase: AppSupabaseClient,
  userId: string,
  seconds: number,
  access: AudioAccess
): Promise<void> {
  if (access.tier === "subscription") {
    const minutes = seconds / 60;
    const { error } = await supabase.rpc("increment_subscription_minutes_used", {
      input_user_id: userId,
      input_minutes: minutes
    });

    if (error) {
      throw new Error(`Could not record subscription usage: ${error.message}`);
    }

    return;
  }

  if (access.tier === "purchased") {
    const { error } = await supabase.rpc("use_purchased_seconds", {
      input_user_id: userId,
      input_seconds: Math.round(seconds)
    });

    if (error) {
      throw new Error(`Could not record purchased minutes usage: ${error.message}`);
    }

    return;
  }

  // Free tier.
  const { error } = await supabase.rpc("increment_usage_seconds", {
    input_user_id: userId,
    input_seconds: Math.round(seconds)
  });

  if (error) {
    throw new Error(`Could not record audio usage: ${error.message}`);
  }
}

/**
 * Returns a summary of the user's quota for display in the UI.
 */
export async function getAudioQuotaSummary(
  supabase: AppSupabaseClient,
  userId: string
) {
  const entitlements = await getEntitlements(supabase, userId);
  const access = evaluateAccess(entitlements);

  return {
    tier: access.tier,
    usedSeconds: access.usedSeconds,
    limitSeconds: access.limitSeconds,
    remainingSeconds: access.remainingSeconds,
    limitMinutes: Math.floor(access.limitSeconds / 60),
    usedMinutes: Math.round(access.usedSeconds / 60),
    remainingMinutes: Math.floor(access.remainingSeconds / 60),
    canRecord: access.canRecord,
    subscriptionExpired: access.subscriptionExpired,
    subscriptionStatus: entitlements.subscription_status,
    subscriptionExpiry: entitlements.subscription_expiry,
    freeMinutesRemaining: Math.floor(
      Math.max(0, FREE_TIER_LIMIT_SECONDS - entitlements.usage_seconds) / 60
    ),
    purchasedMinutesRemaining: Math.floor(
      Math.max(0, entitlements.purchased_seconds_remaining) / 60
    )
  };
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return "0 minutes";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}