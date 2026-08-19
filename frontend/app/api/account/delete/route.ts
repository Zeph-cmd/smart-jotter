import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/env";
import {
  requireAuthenticatedClient,
  requireUserId
} from "@/lib/server/auth";
import { logServerError } from "@/lib/server/errors";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

type DeleteRequestBody = {
  password?: string;
};

const RECENT_AUTH_WINDOW_MS = 5 * 60 * 1000;

function hasPasswordIdentity(user: {
  identities?: Array<{ provider?: string }> | null;
  app_metadata?: { providers?: string[] };
}) {
  return Boolean(
    user.identities?.some((identity) => identity.provider === "email") ||
      user.app_metadata?.providers?.includes("email")
  );
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { ok, retryAfter } = checkRateLimit(
    `account-delete:${ip}`,
    RATE_LIMITS.accountDeletion.limit,
    RATE_LIMITS.accountDeletion.windowMs
  );

  if (!ok) {
    return NextResponse.json(
      { error: "Too many deletion attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let user;
  try {
    const result = await requireAuthenticatedClient();
    user = result.user;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed." },
      { status: 401 }
    );
  }

  const userId = requireUserId(user);
  let body: DeleteRequestBody = {};
  try {
    body = (await request.json()) as DeleteRequestBody;
  } catch {
    // An empty body is valid for Google-only accounts if the session is fresh.
  }

  const passwordIdentity = hasPasswordIdentity(user);
  if (passwordIdentity) {
    if (!body.password) {
      return NextResponse.json(
        { error: "Your current password is required to delete this account." },
        { status: 403 }
      );
    }

    const passwordClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await passwordClient.auth.signInWithPassword({
      email: user.email ?? "",
      password: body.password
    });

    if (error || data.user?.id !== userId) {
      return NextResponse.json(
        { error: "The current password is incorrect." },
        { status: 403 }
      );
    }
  } else {
    const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : NaN;
    if (!Number.isFinite(lastSignIn) || Date.now() - lastSignIn > RECENT_AUTH_WINDOW_MS) {
      return NextResponse.json(
        { error: "Please sign in again immediately before deleting your account." },
        { status: 403 }
      );
    }
  }

  let adminClient;
  try {
    adminClient = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  } catch (error) {
    logServerError("account-delete.configuration", error, { userId });
    return NextResponse.json(
      { error: "Account deletion is not available right now. Please try again later." },
      { status: 503 }
    );
  }

  const tables = [
    "sj_flashcards",
    "sj_notes",
    "sj_folders",
    "sj_ai_usage_log",
    "sj_audio_usage",
    "sj_paystack_transactions",
    "sj_user_entitlements"
  ] as const;

  for (const table of tables) {
    const { error } = await adminClient.from(table).delete().eq("user_id", userId);
    if (error) {
      logServerError("account-delete.data", error, { userId, table });
      return NextResponse.json(
        { error: "We could not complete account deletion. Support has been notified." },
        { status: 500 }
      );
    }
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    logServerError("account-delete.auth", authDeleteError, { userId });
    return NextResponse.json(
      { error: "Your data was removed, but the account could not be closed. Support has been notified." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}