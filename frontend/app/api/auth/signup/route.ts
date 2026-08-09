import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/env";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

// RFC 5322 simplified email pattern — good enough for input validation before
// handing off to Supabase. Supabase does its own validation too.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;

// ============================================================================
// Smart Jotter — Server-side signup with auto-confirm
// ============================================================================
// WHY THIS EXISTS:
//   This project shares a Supabase instance with a school project, so we
//   cannot disable "Confirm email" globally (it would affect the other app).
//   Instead, this route uses the Supabase *service role* key to create the
//   user AND immediately confirm their email, so Smart Jotter users can log
//   in right away without clicking an email link.
//
// SECURITY:
//   - The service_role key bypasses RLS and is ONLY available server-side
//     (never exposed to the browser via NEXT_PUBLIC_).
//   - This endpoint does NOT establish a session. The client signs in
//     separately via the normal anon-key client after we return success.
// ============================================================================

type SignupRequestBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  // Rate limit per IP to prevent brute-force account creation / abuse.
  const ip = getClientIp(request);
  const { ok, retryAfter } = checkRateLimit(
    `signup:${ip}`,
    RATE_LIMITS.signup.limit,
    RATE_LIMITS.signup.windowMs
  );
  if (!ok) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: SignupRequestBody;

  try {
    body = (await request.json()) as SignupRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
      { status: 400 }
    );
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: "Password must be 128 characters or fewer." },
      { status: 400 }
    );
  }

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
    console.error("[signup] Server not configured:", error);
    return NextResponse.json(
      {
        error:
          "Signup is not configured on the server. Add SUPABASE_SERVICE_ROLE_KEY to .env.local."
      },
      { status: 503 }
    );
  }

  // Create the user with email_confirmed_at set to now so they can sign in
  // immediately. This is the admin API equivalent of disabling confirmation
  // for this one user only — it does NOT affect the shared project settings.
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (error) {
    // Handle the common "already registered" case with a helpful message.
    const message = error.message || "Could not create your account.";

    if (message.toLowerCase().includes("already been registered")) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Try logging in instead."
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // TEMPORARY EARLY-ACCESS STARTER CREDITS
  // ---------------------------------------------------------------------------
  // Give every new signup 60 starter AI credits so they can try Simplify,
  // Improve, Explain, Semantic Search, and Ask Your Notes.
  //
  // !!! TEMPORARY — MANUAL TESTING / EARLY ACCESS ONLY !!!
  // Once real subscriptions launch, credit allotment should come from MANUAL
  // activation after payment confirmation (via WhatsApp/MoMo), NOT automatic
  // signup. At that point, either remove this block or change STARTER_CREDITS
  // back to 0 and gate credits behind the activation flow.
  // ---------------------------------------------------------------------------
  const STARTER_CREDITS = 60;

  if (data.user?.id) {
    try {
      await adminClient
        .from("sj_user_entitlements")
        .upsert(
          { user_id: data.user.id, credits_allotted: STARTER_CREDITS },
          { onConflict: "user_id" }
        );
    } catch (entitlementError) {
      // Non-fatal: the user can still log in; credits can be added manually.
      console.error(
        "[signup] Failed to set starter credits:",
        entitlementError
      );
    }
  }

  return NextResponse.json({
    success: true,
    userId: data.user?.id ?? null,
    message: "Account created. You can now log in."
  });
}
