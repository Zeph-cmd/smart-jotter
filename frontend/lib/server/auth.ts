import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/lib/supabase/types";
import { ApiError } from "@/lib/server/errors";

export async function requireAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();

  // Try getUser normally (looks at cookies/headers configured in server client)
  let {
    data: { user },
    error
  } = await supabase.auth.getUser();

  // FALLBACK: If cookie-based auth failed, try parsing the Bearer token directly
  // from the Authorization header (standard for Android/Retrofit).
  if (error || !user) {
    const headerList = await headers();
    const authHeader = headerList.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const { data: fallback, error: fallbackError } = await supabase.auth.getUser(token);
      if (fallback?.user) {
        user = fallback.user;
        error = null;
      } else {
        error = fallbackError;
      }
    }
  }

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
  supabase: AppSupabaseClient,
  userId: string
): Promise<true> {
  const { data, error } = await supabase
    .from("sj_user_entitlements")
    .select("agreed_to_terms")
    .eq("user_id", userId)
    .maybeSingle();

  // If the query fails because the schema is not applied yet (migration not
  // run), we cannot verify the agreement. Fail safe by blocking the request
  // — the client-side gate handles prompting. Other unexpected errors also
  // fail safe with a 403 so nothing is exposed without agreement.
  if (error) {
    // PostgREST returns PGRST205 / code "42P01" when the column is missing.
    const schemaMissing =
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      (error.message ?? "").toLowerCase().includes("does not exist");

    if (schemaMissing) {
      throw new ApiError(
        "Please accept the terms of use before continuing.",
        403
      );
    }

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
