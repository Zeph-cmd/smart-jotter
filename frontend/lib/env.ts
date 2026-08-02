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