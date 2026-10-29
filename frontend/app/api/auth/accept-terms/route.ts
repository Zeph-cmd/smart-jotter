import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/env";
import {
  requireAuthenticatedClient,
  requireUserId
} from "@/lib/server/auth";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";
import { ensureAiStarterCredits } from "@/lib/ai/credits";

export async function POST(request: Request) {
  let userId: string;
  try {
    const { user } = await requireAuthenticatedClient();
    userId = requireUserId(user);
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  // Per-user limit (NOT per-IP): shared IP buckets 429'd legitimate users.
  const { ok, retryAfter } = checkRateLimit(
    `accept-terms:${userId}`,
    RATE_LIMITS.termsStatus.limit,
    RATE_LIMITS.termsStatus.windowMs
  );
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const adminClient = createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      // Smart Jotter tables live in the "jotter" schema of the shared project.
      db: { schema: "jotter" },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  // Record acceptance FIRST. Starter-credit repair is best-effort and must
  // never block the agreement write — if credits init fails, acceptance is
  // still persisted so the user isn't stuck on the agreement screen forever.
  const { error: upsertError } = await adminClient
    .from("sj_user_entitlements")
    .upsert(
      {
        user_id: userId,
        agreed_to_terms: true,
        agreed_to_terms_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("[accept-terms] Repair failed:", upsertError.message);
    return NextResponse.json({ error: "Could not save agreement." }, { status: 500 });
  }

  let creditsInitialized = true;
  try {
    await ensureAiStarterCredits(adminClient, userId);
  } catch (error) {
    creditsInitialized = false;
    console.error("[accept-terms] Starter credits repair failed:", error);
  }

  return NextResponse.json({ success: true, agreed: true, creditsInitialized });
}

/**
 * Returns the caller's terms-agreement status. Read via the service-role key
 * (server-side) instead of a client-side table read: browser reads of
 * `jotter.sj_user_entitlements` can be blocked by RLS/grants and silently fail
 * to `agreed: false`, which made the agreement screen reappear on every login
 * even after the user had accepted.
 */
export async function GET(request: Request) {
  let userId: string;
  try {
    const { user } = await requireAuthenticatedClient();
    userId = requireUserId(user);
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const { ok, retryAfter } = checkRateLimit(
    `accept-terms-status:${userId}`,
    RATE_LIMITS.termsStatus.limit,
    RATE_LIMITS.termsStatus.windowMs
  );
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  const adminClient = createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      db: { schema: "jotter" },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );

  const { data, error } = await adminClient
    .from("sj_user_entitlements")
    .select("agreed_to_terms, agreed_to_terms_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[accept-terms] Status read failed:", error.message);
    return NextResponse.json({ error: "Could not load agreement status." }, { status: 500 });
  }

  return NextResponse.json({
    agreed: data?.agreed_to_terms ?? false,
    agreedAt: data?.agreed_to_terms_at ?? null
  });
}
