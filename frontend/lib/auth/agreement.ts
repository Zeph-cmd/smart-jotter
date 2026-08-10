/**
 * Terms-agreement helpers for Smart Jotter.
 *
 * Every user must accept the short terms list once before they can use notes or
 * AI features. The agreement state lives on sj_user_entitlements
 * (agreed_to_terms boolean, agreed_to_terms_at timestamptz).
 *
 * This module reads that state and exposes:
 *   - hasAgreedToTerms(): client read used by the auth gate / agreement screen.
 *   - setTermsAgreed():   client call to record acceptance after "Continue".
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
 * Records the user's acceptance of the terms via the accept_terms RPC.
 * The RPC is security definer so it safely creates the row if it does not exist.
 */
export async function setTermsAgreed(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Strategy: try the RPC first (preferred — security definer, creates the
  // row if it doesn't exist). If that fails (e.g. RPC not created yet or
  // unique constraint missing), fall back to a direct upsert.
  const { error: rpcError } = await supabase.rpc("accept_terms", {
    input_user_id: userId
  });

  if (!rpcError) {
    return;
  }

  // Fallback: direct upsert into the entitlements table.
  const { error: upsertError } = await supabase
    .from("sj_user_entitlements")
    .upsert(
      {
        user_id: userId,
        agreed_to_terms: true,
        agreed_to_terms_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    throw new Error(
      `Could not save your agreement: ${upsertError.message || rpcError.message}`
    );
  }
}
