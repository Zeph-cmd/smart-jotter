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

import type { AppSupabaseClient } from "@/lib/supabase/types";

export type TermsAgreementStatus = {
  agreed: boolean;
  agreedAt: string | null;
};

type TermsStatusResponse = {
  agreed?: boolean;
  agreedAt?: string | null;
  error?: string;
};

type AcceptTermsResponse = {
  success?: boolean;
  agreed?: boolean;
  agreedAt?: string | null;
  error?: string;
};

/**
 * Reads the user's terms-agreement state via the server-side GET endpoint
 * (`/api/auth/accept-terms`), which uses the service_role key. A direct
 * browser read of sj_user_entitlements could be blocked by RLS/grants and
 * silently fail to `agreed: false`, making the agreement screen reappear on
 * every login even after acceptance.
 *
 * Returns { agreed: false } if the row does not exist yet (first-time user) so
 * the user is prompted to accept, and also on network/API failure (fail safe).
 */
export async function getTermsAgreement(): Promise<TermsAgreementStatus> {
  try {
    const response = await fetch("/api/auth/accept-terms", {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      return { agreed: false, agreedAt: null };
    }

    const data = (await response.json()) as TermsStatusResponse;

    return {
      agreed: data.agreed ?? false,
      agreedAt: data.agreedAt ?? null
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
  _supabase: AppSupabaseClient,
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