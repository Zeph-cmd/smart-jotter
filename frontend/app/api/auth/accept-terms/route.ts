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
import { ensureAiStarterCredits } from "@/lib/ai/credits";

export async function POST(request: Request) {
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

  let userId: string;
  try {
    const { user } = await requireAuthenticatedClient();
    userId = requireUserId(user);
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  const adminClient = createClient(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    await ensureAiStarterCredits(adminClient, userId);
  } catch (error) {
    console.error("[accept-terms] Starter credits repair failed:", error);
    return NextResponse.json(
      { error: "Could not initialize your starter credits." },
      { status: 500 }
    );
  }

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

  return NextResponse.json({ success: true, agreed: true });
}
