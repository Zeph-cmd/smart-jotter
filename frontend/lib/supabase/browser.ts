"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import type { AppSupabaseClient } from "@/lib/supabase/types";

let browserClient: AppSupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      // Smart Jotter tables live in the dedicated "jotter" schema of the
      // shared Supabase project (the school app uses a different schema).
      // This routes every PostgREST query via Accept-Profile: jotter.
      db: { schema: "jotter" },
      auth: {
        persistSession: true
      }
    });

    // NOTE: do NOT configure autoRefreshToken / detectSessionInUrl here.
    // @supabase/ssr's createBrowserClient spreads user auth options FIRST and
    // then force-overwrites them with autoRefreshToken: true and
    // detectSessionInUrl: true (verified in ssr dist/main/createBrowserClient.js),
    // so custom values are silently ignored. The library is therefore the
    // single owner of token refresh (single-flight + backoff) and PKCE
    // exchange — exactly what we want now that no middleware races it.
    // Previously a bespoke refresh system in AuthProvider plus the library's
    // own engine produced duplicate /auth/v1/token storms after sign-in.
  }

  return browserClient;
}