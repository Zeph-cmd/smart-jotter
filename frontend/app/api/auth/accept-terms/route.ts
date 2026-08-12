import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/env";
import {
  requireAuthenticatedClient,
  requireUserId
} from "@/lib/server/auth";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

// ============================================================================
// Smart Jotter — Server-side terms-acceptance endpoint
// ============================================================================
// WHY THIS EXISTS:
//   The previous client-side write (accept_terms RPC / direct upsert via the
//   anon-key browser client) was unreliable. If the RPC was missing, RLS
//   blocked the write, or the schema column didn't exist, the write would
//   silently fail. The optimistic client state (hasAgreedToTerms = true) then
//   masked the failure — until the next auth-state change re-read the DB,
//   discovered agreed_to_terms was still false, and the agreement modal
//   popped up again.
//
//   This route uses the Supabase *service_role* key (server-side only) to
//   bypass RLS entirely, guaranteeing the write always succeeds. It then
//   VERIFIES the write by reading it back, so the client can trust the
//   response and only flip its optimistic state when the DB actually shows
//   agreed_to_terms = true. Once recorded, the modal never shows again for
//   that account on any device or browser.
// ============================================================================

export async function POST(request: Request) {
  // Rate limit per IP to prevent abuse.
  const ip = getClientIp(request);
  const { ok, retryAfter } = checkRateLimit(
    `accept-terms:${ip}`,
    RATE_LIMITS.signup.limit,
    RATE_LIMITS.signup.windowMs
  );
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // Authenticate the caller from their session cookies.
  let userId: string;
  try {
    const { user } = await requireAuthenticatedClient();
    userId = requireUserId(user);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Authentication failed.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  // Create a service-role admin client that bypasses RLS entirely.
  let adminClient;
  try {
    adminClient = createClient(
      getSupabaseUrl(),
      getSupabaseServiceRoleKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  } catch (error) {
    console.error("[accept-terms] Server not configured:", error);
    return NextResponse.json(
      {
        error:
          "The server is not fully configured. Please contact support if this persists."
      },
      { status: 503 }
    );
  }

  // ---- Write agreed_to_terms = true via RPC (preferred) ----
  // The accept_terms function is security definer and idempotent.
  const { error: rpcError } = await adminClient.rpc("accept_terms", {
    input_user_id: userId
  });

  if (rpcError) {
    // Fallback: direct upsert with the service role key (bypasses RLS).
    const { error: upsertError } = await adminClient
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
      console.error("[accept-terms] Write failed:", {
        rpc: rpcError.message,
        upsert: upsertError.message
      });
      return NextResponse.json(
        { error: "Could not save your agreement. Please try again." },
        { status: 500 }
      );
    }
  }

  // ---- VERIFY: read back to confirm the write actually persisted ----
  // This is the critical step that was missing. We never trust the write
  // until we can read agreed_to_terms = true from the database.
  const { data, error: verifyError } = await adminClient
    .from("sj_user_entitlements")
    .select("agreed_to_terms, agreed_to_terms_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (verifyError || !data?.agreed_to_terms) {
    console.error("[accept-terms] Verification failed:", {
      verify: verifyError?.message,
      agreed: data?.agreed_to_terms
    });
    return NextResponse.json(
      { error: "Could not confirm your agreement. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    agreed: true,
    agreedAt: data.agreed_to_terms_at ?? null
  });
}