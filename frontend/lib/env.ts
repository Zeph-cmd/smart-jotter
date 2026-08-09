/**
 * The public site URL for the current environment.
 *
 * Priority:
 *   1. NEXT_PUBLIC_SITE_URL  (explicit per-environment setting)
 *   2. VERCEL_URL            (auto-set by Vercel, e.g. smart-jotter.vercel.app)
 *   3. "http://localhost:3000" (local dev fallback)
 *
 * This is used for Supabase redirect URLs (password reset, email confirm) and
 * any other place we need to know our own origin. Never hardcode localhost in
 * these flows — that breaks the link in production.
 *
 * No trailing slash.
 */
export function getPublicSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    // VERCEL_URL is scheme-less ("smart-jotter.vercel.app").
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}

export function getSupabaseUrl() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!value) {
    throw new Error(
      "Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL."
    );
  }

  return value;
}

export function getSupabaseAnonKey() {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!value) {
    throw new Error(
      "Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY."
    );
  }

  return value;
}

export function getOpenAIKey() {
  return process.env.OPENAI_API_KEY;
}

export function getDeepgramKey() {
  return process.env.DEEPGRAM_API_KEY;
}

export function getSupabaseServiceRoleKey() {
  const value =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;

  if (!value) {
    throw new Error(
      "Missing Supabase service role key. Set SUPABASE_SERVICE_ROLE_KEY in .env.local. " +
        "Find it in Supabase Dashboard > Project Settings > API > service_role key."
    );
  }

  return value;
}

/**
 * Paystack SECRET key — server-side only (never expose to the browser).
 * Used to verify transactions and validate webhook signatures.
 */
export function getPaystackSecretKey() {
  const value = process.env.PAYSTACK_SECRET_KEY;

  if (!value) {
    throw new Error(
      "Missing Paystack secret key. Set PAYSTACK_SECRET_KEY in .env.local / Vercel."
    );
  }

  return value;
}

/**
 * Paystack PUBLIC key — safe to expose to the browser via NEXT_PUBLIC_.
 * Used by the inline JS popup to initialise the payment.
 */
export function getPaystackPublicKey() {
  const value = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  if (!value) {
    throw new Error(
      "Missing Paystack public key. Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in .env.local / Vercel."
    );
  }

  return value;
}
