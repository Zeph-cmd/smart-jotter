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
        // CRITICAL: supabase-js enables autoRefreshToken by default. It runs a
        // background timer (_recoverAndRefresh) that retries /oauth/token on its
        // own schedule, independently of any React effect. When a refresh token
        // is permanently invalid (revoked, user deleted, corrupted cookie), the
        // timer never converges and produces an infinite 429 storm that blocks
        // the app from ever leaving the loading skeleton.
        //
        // We disable it here and instead perform a SINGLE explicit refresh
        // during bootstrap in AuthProvider, signing out locally on failure.
        // Session continuity during active use is handled by:
        //   - the middleware, which refreshes cookies on each server request, and
        //   - a visibilitychange listener in AuthProvider that refreshes once
        //     when the user returns to the tab with a near-expiry token.
        autoRefreshToken: false,
        persistSession: true,
        // We don't use the implicit OAuth flow, so skip URL-hash parsing on
        // every load (avoids unnecessary work / edge cases).
        detectSessionInUrl: false
      }
    });
  }

  return browserClient;
}