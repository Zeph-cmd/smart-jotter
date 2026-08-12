/**
 * Terms-agreement helpers for Smart Jotter.
 *
 * Every user must accept the short terms list once before they can use notes or
 * AI features. The agreement state lives on sj_user_entitlements
 * (agreed_to_terms boolean, agreed_to_terms_at timestamptz).
 *
 * This module reads that state and exposes:
 *   - getTermsAgreement(): client read used by the auth gate / agreement screen.
 *   - setTermsAgreed():   records acceptance via the server-side API route.
 *
 * IMPORTANT: Acceptance is written via the /api/auth/accept-terms server route
 * (which uses the Supabase service_role key, bypassing RLS entirely) instead of
 * a client-side RPC/upsert. The old client-side write could silently fail (RPC
 * missing, RLS blocking the write, column not added), which caused the agreement
 * modal to keep popping up because the DB never actually recorded agreed = true.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type TermsAgreementStatus = {
  agreed: boolean;
  agreedAt: string | null;
};

type AgreementRow = {
  agreed_to_terms: boolean | null;
  agreed_to_terms_at: string | null;
};

type AcceptTermsResponse = {
  success?: boolean;
  agreed?: boolean;
  agreedAt?: string | null;
  error?: string;
};

/**
 * Reads the user's terms-agreement state. Returns { agreed: false } if the row
 * does not exist yet (first-time user) so they are prompted to accept.
 */
export async function getTermsAgreement(
  supabase: SupabaseClient,
  userId: string
): Promise<TermsAgreementStatus> {
  try {
    const { data, error } = await supabase
      .from("sj_user_entitlements")
      .select("agreed_to_terms, agreed_to_terms_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      // Schema may not be applied yet (migration not run) or RLS may block
      // the read. Fail safe: treat as "not agreed" so the agreement screen
      // is shown rather than getting stuck on a loading state.
      return { agreed: false, agreedAt: null };
    }

    const row = (data ?? null) as AgreementRow | null;

    return {
      agreed: row?.agreed_to_terms ?? false,
      agreedAt: row?.agreed_to_terms_at ?? null
    };
  } catch {
    // Network error, client misconfiguration, etc. — still fail safe.
    return { agreed: false, agreedAt: null };
  }
}

/**
 * Records the user's acceptance of the terms via the server-side API route.
 *
 * The route uses the Supabase service_role key (server-side only) to bypass
 * RLS and write agreed_to_terms = true. It then verifies the write by reading
 * it back, returning { agreed: true } only when the DB actually shows the
 * value. This guarantees that once a user accepts, the modal never shows again
 * for that account on any device or browser.
 *
 * Throws an Error if the write could not be persisted or verified.
 */
export async function setTermsAgreed(
  _supabase: SupabaseClient,
  _userId: string
): Promise<void> {
  const response = await fetch("/api/auth/accept-terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });

  const data = (await response.json()) as AcceptTermsResponse;

  if (!response.ok || !data.success || !data.agreed) {
    throw new Error(
      data.error || "Could not save your agreement. Please try again."
    );
  }
}