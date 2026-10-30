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
        // timer never converges and produces an infinite request storm that
        // blocks the app from ever leaving the loading skeleton.
        //
        // We disable it here and instead perform a SINGLE explicit refresh
        // during bootstrap in AuthProvider, signing out locally on failure.
        // Session continuity during active use:
        //   - the browser client itself writes fresh session cookies on every
        //     successful refresh, so server routes always see a valid token, and
        //   - a visibilitychange listener in AuthProvider refreshes once when
        //     the user returns to the tab with a near-expiry token.
        autoRefreshToken: false,
        persistSession: true,
        // We don't use the implicit OAuth flow, so skip URL-hash parsing on
        // every load (avoids unnecessary work / edge cases).
        detectSessionInUrl: false
      }
    });

    // Belt and braces: @supabase/ssr's browser client manages its own
    // visibilitychange listener that can re-enable the auto-refresh timer when
    // the tab regains focus, regardless of the config above. A background
    // timer retrying refreshes against a poisoned/rotated token is exactly
    // what produced the endless /auth/v1/token loop, so keep it off for good.
    try {
      void browserClient.auth.stopAutoRefresh();
    } catch {
      /* older clients may not expose this — config above still applies */
    }
  }

  return browserClient;
}