import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AppSupabaseClient } from "@/lib/supabase/types";
import { ApiError } from "@/lib/server/errors";

/**
 * Extracts the access token from the @supabase/ssr auth cookie(s) WITHOUT
 * triggering any token refresh. The cookie holds the session JSON (chunked
 * across `sb-<ref>-auth-token.<n>` cookies when large).
 *
 * Why this matters: supabase.auth.getUser() with NO explicit token argument
 * reads the stored session and, when the access token is expired, silently
 * REFRESHES server-side — rotating the refresh token. Multiple parallel API
 * calls each rotate independently and the browser ends up holding a
 * superseded refresh token, which gets the user signed out minutes after
 * login. This was the same token-rotation race the middleware had, relocated
 * to the API layer. Verifying an explicit token never refreshes, so API
 * routes are pure verifiers and the browser client remains the ONLY refresher
 * (this is also why the Android app — which uses the Bearer path — never
 * suffered from this bug).
 */
function extractAccessTokenFromCookies(
  all: { name: string; value: string }[]
): string | null {
  try {
    const baseNames = Array.from(
      new Set(
        all
          .filter((c) => /^sb-.*-auth-token/.test(c.name))
          .map((c) => c.name.replace(/\.(\d+)$/, ""))
      )
    );

    for (const base of baseNames) {
      const raw = all
        .filter((c) => c.name === base || c.name.startsWith(`${base}.`))
        .sort((a, b) => {
          const indexA = a.name === base ? 0 : Number(a.name.split(".").pop() ?? 0);
          const indexB = b.name === base ? 0 : Number(b.name.split(".").pop() ?? 0);
          return indexA - indexB;
        })
        .map((c) => c.value)
        .join("");

      for (const candidate of [decodeURIComponent(raw), raw]) {
        try {
          const parsed = JSON.parse(candidate) as { access_token?: string };
          if (parsed?.access_token) {
            return parsed.access_token;
          }
        } catch {
          /* try next candidate */
        }
      }
    }
  } catch {
    /* fall through to null */
  }

  return null;
}

export async function requireAuthenticatedClient() {
  const supabase = await createServerSupabaseClient();

  let user: User | null = null;
  let error: Error | null = null;

  // PRIMARY: verify the access token from the auth cookie. Explicit-token
  // verification NEVER refreshes or rotates anything — the browser client is
  // the single refresher.
  const cookieStore = await cookies();
  const accessToken = extractAccessTokenFromCookies(cookieStore.getAll());

  if (accessToken) {
    const verified = await supabase.auth.getUser(accessToken);
    if (verified.data.user) {
      user = verified.data.user;
    } else {
      error = verified.error;
    }
  }

  // FALLBACK 1: Bearer token from the Authorization header (Android app).
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

  // LAST RESORT: legacy cookie-session path (may refresh server-side). Only
  // reached when the cookie could not be parsed into an explicit token —
  // rare, and never on the hot path.
  if (error || !user) {
    const legacy = await supabase.auth.getUser();
    if (legacy.data.user) {
      user = legacy.data.user;
      error = null;
    } else {
      error = legacy.error;
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
