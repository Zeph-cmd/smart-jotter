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
