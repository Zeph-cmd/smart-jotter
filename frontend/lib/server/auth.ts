import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/server/errors";

export async function requireAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw new ApiError("Authentication failed. Please sign in again.", 401);
  }

  if (!user) {
    throw new ApiError("Please sign in to continue.", 401);
  }

  return {
    supabase,
    user
  };
}

export function requireUserId(user: User) {
  if (!user.id) {
    throw new ApiError("User account is missing an id.", 401);
  }

  return user.id;
}

/**
 * Ensures the authenticated user has accepted the terms of use.
 * Use this as defense-in-depth on AI / notes API routes so that even if a
 * client-side gate is bypassed, the server still blocks the request until the
 * agreement is recorded.
 *
 * Returns true when agreed; throws an ApiError (403) otherwise.
 */
export async function requireTermsAccepted(
  supabase: SupabaseClient,
  userId: string
): Promise<true> {
  const { data, error } = await supabase
    .from("sj_user_entitlements")
    .select("agreed_to_terms")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError("Could not verify terms agreement.", 500);
  }

  if (!data?.agreed_to_terms) {
    throw new ApiError(
      "Please accept the terms of use before continuing.",
      403
    );
  }

  return true;
}
