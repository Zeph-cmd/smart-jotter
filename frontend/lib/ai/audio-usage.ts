import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/server/errors";

/**
 * Monthly audio transcription quota. 4 hours = 14,400 seconds.
 */
export const MONTHLY_AUDIO_QUOTA_SECONDS = 4 * 60 * 60;

/**
 * Maximum duration of a single continuous recording. 30 minutes = 1,800
 * seconds. Enforced client-side by the voice recorder hook (it auto-stops
 * and restarts a new recording).
 */
export const MAX_RECORDING_SECONDS = 30 * 60;

type AudioUsageRow = {
  seconds_used: number;
};

function getMonthKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Returns the number of seconds of audio the user has consumed in the current
 * calendar month (UTC).
 */
export async function getMonthlyAudioUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const monthKey = getMonthKey();

  const { data, error } = await supabase
    .from("sj_audio_usage")
    .select("seconds_used")
    .eq("user_id", userId)
    .eq("month_key", monthKey)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not check audio usage: ${error.message}`);
  }

  return (data as AudioUsageRow | null)?.seconds_used ?? 0;
}

/**
 * Ensures the user has enough remaining quota for the requested duration.
 * Throws an ApiError (402) if the monthly limit would be exceeded.
 */
export async function enforceAudioQuota(
  supabase: SupabaseClient,
  userId: string,
  requestedSeconds: number
): Promise<void> {
  const used = await getMonthlyAudioUsage(supabase, userId);
  const remaining = MONTHLY_AUDIO_QUOTA_SECONDS - used;

  if (requestedSeconds > remaining) {
    throw new ApiError(
      `Monthly audio limit reached. You have ${formatDuration(remaining)} left this month.`,
      402
    );
  }
}

/**
 * Adds the given number of seconds to the user's usage for the current month.
 * Uses an upsert so the row is created on first use.
 */
export async function incrementAudioUsage(
  supabase: SupabaseClient,
  userId: string,
  seconds: number
): Promise<void> {
  const { error } = await supabase.rpc("increment_audio_usage", {
    input_user_id: userId,
    input_seconds: seconds
  });

  if (error) {
    throw new Error(`Could not record audio usage: ${error.message}`);
  }
}

/**
 * Returns a summary of the user's quota for display in the UI.
 */
export async function getAudioQuotaSummary(
  supabase: SupabaseClient,
  userId: string
) {
  const used = await getMonthlyAudioUsage(supabase, userId);
  const limit = MONTHLY_AUDIO_QUOTA_SECONDS;

  return {
    usedSeconds: used,
    limitSeconds: limit,
    remainingSeconds: Math.max(0, limit - used),
    limitMinutes: Math.floor(limit / 60),
    usedMinutes: Math.round(used / 60),
    remainingMinutes: Math.floor(Math.max(0, limit - used) / 60)
  };
}

function formatDuration(totalSeconds: number): string {
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