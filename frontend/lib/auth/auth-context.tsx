"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
// (useRef not currently needed; bootstrap runs once because the `supabase`
// dependency is a stable singleton.)
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { getTermsAgreement, setTermsAgreed } from "@/lib/auth/agreement";

type AuthContextValue = {
  isLoading: boolean;
  /** True until we've finished loading the terms-agreement state for a signed-in user. */
  isAgreementLoading: boolean;
  /** Whether the signed-in user has accepted the terms. null while loading / logged out. */
  hasAgreedToTerms: boolean | null;
  /** Records terms acceptance and flips hasAgreedToTerms to true. */
  acceptTerms: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level guards that enforce "refresh at most ONCE per page load".
//
// Why module-level (not useRef/useState): React state/refs reset on every
// remount, but a dead refresh token can survive across remounts in
// localStorage. A module-level flag survives remounts within the same page
// lifecycle, guaranteeing we never ask Supabase to refresh more than once —
// no matter how many times AuthProvider re-mounts (StrictMode, layout shifts,
// route transitions that preserve the provider, error-boundary recovery).
// This is the single most important defence against the
// /auth/v1/token?grant_type=refresh 429 rate-limit storm.
let bootstrapStarted = false;
// True once we have attempted (or are attempting) a refresh this page load.
// Set on every refresh path and never cleared except when a brand-new sign-in
// gives us a fresh, valid session.
let refreshAttempted = false;
// Prevents overlapping refreshes between bootstrap and the visibility handler.
let isRefreshing = false;

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Terms-agreement state. null = unknown/loading, boolean = resolved status.
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean | null>(null);
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);

  useEffect(() => {
    try {
      setSupabase(createBrowserSupabaseClient());
    } catch {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    // Hard safety net: no matter what happens (network hung, a refresh loop we
    // didn't anticipate, an unhandled rejection), never leave the app stuck on
    // the loading skeleton forever. After this many ms we force loading off so
    // the user at least sees the login screen and can retry.
    const LOADING_TIMEOUT_MS = 12_000;
    const loadingTimer = window.setTimeout(() => {
      setIsLoading(false);
    }, LOADING_TIMEOUT_MS);

    // "Once per session load" guard: if AuthProvider re-mounts (StrictMode,
    // layout shifts, route transitions that preserve the provider, error
    // boundary recovery) we must NOT re-run the bootstrap that can call
    // refreshSession(). A remount with a dead token in storage is exactly the
    // scenario that produced the /auth/v1/token 429 storm. The module-level
    // flag survives remounts within one page lifecycle, so this block — the
    // ONLY place a refresh can happen during bootstrap — runs at most once.
    if (bootstrapStarted) {
      // Still surface whatever session storage holds so the UI is correct,
      // but never re-attempt a refresh.
      void (async () => {
        try {
          const {
            data: { session: cached }
          } = await supabase.auth.getSession();
          if (!isMounted) return;
          setSession(cached);
          setUser(cached?.user ?? null);
        } catch {
          /* ignore — leave current state */
        } finally {
          if (isMounted) setIsLoading(false);
        }
      })();
    } else {
      bootstrapStarted = true;

      const loadSession = async () => {
        // Single-writer guard so the visibility handler can't overlap with
        // bootstrap and double-fire the refresh endpoint.
        isRefreshing = true;
        try {
          const {
            data: { session: currentSession }
          } = await supabase.auth.getSession();

          if (!isMounted) {
            return;
          }

          // autoRefreshToken is DISABLED on the browser client (see
          // lib/supabase/browser.ts) to prevent the background timer from
          // hammering /oauth/token on a dead refresh token. This block is the
          // SINGLE place we allow a refresh during bootstrap — exactly one
          // attempt, and on any failure we clear local state and fall back to
          // the login screen. There is no retry path here, so no 429 storm.
          if (currentSession) {
            // Refresh iff the access token is already expired or about to
            // expire (< 60s). If the token is still good, just verify the user
            // still exists server-side. Either branch fails closed.
            const expiresAt = currentSession.expires_at ?? 0;
            const nowSec = Math.floor(Date.now() / 1000);
            const shouldRefresh = expiresAt - nowSec < 60;

            let failed = false;

            if (shouldRefresh) {
              // Hard guarantee: across bootstrap + visibility handler + any
              // remount, we ask Supabase to refresh AT MOST ONCE per page
              // load. Without this, two concurrent paths (or a remount racing
              // the visibility handler) can each fire refreshSession() against
              // the same dead token and pile up requests.
              if (refreshAttempted) {
                failed = true;
              } else {
                refreshAttempted = true;
                const { error: refreshError } = await supabase.auth.refreshSession();
                failed = Boolean(refreshError);
              }
            } else {
              const { error: userError } = await supabase.auth.getUser();
              failed = Boolean(userError);
            }

            if (failed) {
              // scope: "local" avoids an extra (failing) server revocation call
              // — the token is already bad. It clears cookies/storage so the
              // client holds no dead credentials, which also stops the
              // visibility handler and any remount from retrying on the same
              // dead token.
              try {
                await supabase.auth.signOut({ scope: "local" });
              } catch {
                /* already cleared as best-effort */
              }

              if (!isMounted) {
                return;
              }

              setSession(null);
              setUser(null);
              setIsLoading(false);
              return;
            }
          }

          // Re-read so we pick up the refreshed session if one happened.
          const {
            data: { session: resolvedSession }
          } = await supabase.auth.getSession();

          if (!isMounted) {
            return;
          }

          setSession(resolvedSession);
          setUser(resolvedSession?.user ?? null);
          setIsLoading(false);
        } catch {
          // Unexpected failure (network drop, client misconfiguration). Fail
          // safe: clear any dead session so subsequent mounts/visibility
          // events don't retry on it. Never leave the app stuck loading.
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            /* ignore */
          }
          if (isMounted) {
            setSession(null);
            setUser(null);
            setIsLoading(false);
          }
        } finally {
          isRefreshing = false;
        }
      };

      void loadSession();
    }

    // Because autoRefreshToken is off, refresh the session once when the user
    // returns to the tab IF the token is near expiry. This keeps long-lived
    // tabs working without re-introducing a background retry loop. The
    // module-level `isRefreshing` AND `refreshAttempted` guards prevent both
    // overlapping refreshes and a retry storm on a dead token.
    const onVisibilityChange = () => {
      if (
        document.visibilityState !== "visible" ||
        isRefreshing ||
        refreshAttempted
      ) {
        return;
      }

      void (async () => {
        try {
          const {
            data: { session: s }
          } = await supabase.auth.getSession();
          if (!s) {
            return;
          }
          const nowSec = Math.floor(Date.now() / 1000);
          if ((s.expires_at ?? 0) - nowSec >= 60) {
            return;
          }

          // Claim the single refresh slot for this page load. If bootstrap
          // already tried (and failed), we don't try again here — the token
          // is almost certainly dead and another request would feed the 429.
          refreshAttempted = true;
          isRefreshing = true;
          const { error } = await supabase.auth.refreshSession();
          if (error && isMounted) {
            // Refresh failed on return — sign out locally so the UI reflects
            // reality instead of holding a stale/expired token.
            try {
              await supabase.auth.signOut({ scope: "local" });
            } catch {
              /* ignore */
            }
          }
        } catch {
          /* non-fatal: next bootstrap will retry */
        } finally {
          isRefreshing = false;
        }
      })();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // A brand-new sign-in (user just typed their password, or completed
      // sign-up) produces a fresh, valid refresh token. Reset the
      // refresh-attempt guard so the visibility handler can keep this new
      // session alive later — otherwise the "once per page load" limit from
      // a *previous* dead token would permanently block all future refreshes.
      if (event === "SIGNED_IN" && nextSession) {
        refreshAttempted = false;
      }

      // When the session disappears (explicit sign-out, or Supabase giving up
      // on refreshing), clear the user so the UI returns to the login screen
      // rather than holding a stale session.
      if (event === "SIGNED_OUT" || nextSession === null) {
        setSession(null);
        setUser(null);
      } else {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      window.clearTimeout(loadingTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Load the terms-agreement state whenever the signed-in user changes.
  // Reset to null on logout / loading so the gate treats it as "unknown".
  useEffect(() => {
    if (!supabase || !user) {
      setHasAgreedToTerms(null);
      setIsAgreementLoading(false);
      return;
    }

    let isMounted = true;
    setIsAgreementLoading(true);

    // Safety net: never leave a signed-in user on the agreement loading
    // skeleton forever, even if the DB read hangs (e.g. network drop). After
    // this many ms, fall back to "not agreed" so the agreement screen renders
    // and the user can retry instead of staring at a skeleton.
    const AGREEMENT_TIMEOUT_MS = 12_000;
    const agreementTimer = window.setTimeout(() => {
      if (isMounted) {
        setHasAgreedToTerms(false);
        setIsAgreementLoading(false);
      }
    }, AGREEMENT_TIMEOUT_MS);

    const loadAgreement = async () => {
      try {
        const status = await getTermsAgreement(supabase, user.id);
        if (isMounted) {
          setHasAgreedToTerms(status.agreed);
        }
      } catch {
        if (isMounted) {
          // Fail closed: treat unknown errors as not-yet-agreed so the user
          // can still see the agreement screen and retry.
          setHasAgreedToTerms(false);
        }
      } finally {
        if (isMounted) {
          setIsAgreementLoading(false);
        }
      }
    };

    void loadAgreement();

    return () => {
      isMounted = false;
      window.clearTimeout(agreementTimer);
    };
  }, [supabase, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAgreementLoading,
      hasAgreedToTerms,
      session,
      user,
      async acceptTerms() {
        if (!supabase || !user) {
          throw new Error("Authentication is not configured yet.");
        }

        await setTermsAgreed(supabase, user.id);
        setHasAgreedToTerms(true);
      },
      async signIn(email, password) {
        if (!supabase) {
          throw new Error("Authentication is not configured yet.");
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          throw new Error(error.message || "Could not sign in. Check your email and password.");
        }
      },
      async signInWithGoogle() {
        if (!supabase) {
          throw new Error("Authentication is not configured yet.");
        }

        // Redirect back to the site root after Google completes. The home
        // page (HomeShell) is the single post-login entry point: it renders
        // NotesPage for returning users, or the AgreementScreen for first-time
        // users who haven't accepted terms yet — so Google sign-in flows
        // through the exact same gate as email/password. No separate path.
        //
        // Priority matches resetPassword():
        //   1. NEXT_PUBLIC_SITE_URL (canonical origin for production/preview)
        //   2. window.location.origin (local dev fallback)
        const origin =
          process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
          (typeof window !== "undefined" ? window.location.origin : "");

        const redirectTo = origin ? `${origin}/` : undefined;

        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: redirectTo ? { redirectTo } : undefined
        });

        if (error) {
          throw new Error(error.message || "Could not start Google sign-in.");
        }

        // signInWithOAuth() redirects the browser to Google's consent page,
        // so the Promise resolves (and React state updates) are moot — the
        // page will be unloaded. The SIGNED_IN auth-state event fires on the
        // return landing, which HomeShell reacts to like any other sign-in.
      },
      async signOut() {
        if (!supabase) {
          throw new Error("Authentication is not configured yet.");
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          throw new Error(error.message || "Could not sign out right now.");
        }
      },
      async resendConfirmation(email) {
        if (!supabase) {
          throw new Error("Authentication is not configured yet.");
        }

        // Prefer the configured site URL so email links always point at the
        // canonical origin, regardless of where the page is loaded from.
        const emailRedirectTo =
          process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
          (typeof window !== "undefined" ? window.location.origin : undefined);

        const { error } = await supabase.auth.resend({
          type: "signup",
          email,
          options: {
            emailRedirectTo
          }
        });

        if (error) {
          throw new Error(error.message || "Could not resend confirmation email.");
        }
      },
      async signUp(email, password) {
        if (!supabase) {
          throw new Error("Authentication is not configured yet.");
        }

        // Create the account via our server-side route, which uses the
        // Supabase service role key to auto-confirm the email. This lets
        // Smart Jotter users sign in immediately WITHOUT disabling email
        // confirmation globally (important: this Supabase project is shared
        // with a school project).
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = (await response.json()) as { error?: string; success?: boolean };

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Could not create your account right now.");
        }

        // Account is created and confirmed — sign the user in immediately.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          throw new Error(
            "Account created, but we couldn't sign you in automatically. " +
              "Please log in with your email and password."
          );
        }
      },
      async resetPassword(email) {
        if (!supabase) {
          throw new Error("Authentication is not configured yet.");
        }

        // Build an environment-aware redirect URL for the password-reset link.
        // Priority:
        //   1. NEXT_PUBLIC_SITE_URL (explicit per-environment setting) — this is
        //      the canonical, source-of-truth origin. It guarantees the email
        //      link points at the correct site even when the browser origin is
        //      a preview/staging domain or localhost.
        //   2. window.location.origin  (fallback for local dev)
        //
        // IMPORTANT — scanner-safe reset flow:
        // The FINAL destination after Supabase exchanges the recovery token is
        // still /reset-password (it MUST be listed in Supabase's allowed
        // redirect URLs). BUT the link the user actually clicks in the email
        // points at our intermediate page /reset-password/start, with the real
        // confirmation URL passed in the URL fragment. This stops email
        // security scanners from prefetching the single-use token.
        //
        // The intermediate page + the Supabase email-template change are
        // documented in EMAIL_SECURITY.md. The Supabase "Reset Password" email
        // template must link to:
        //   {{ .SiteURL }}/reset-password/start#confirm={{ .ConfirmationURL }}
        const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

        const origin =
          configuredSiteUrl?.replace(/\/+$/, "") ||
          (typeof window !== "undefined" ? window.location.origin : "");

        const redirectTo = origin ? `${origin}/reset-password` : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo
        });

        if (error) {
          // Preserve the original Supabase error object so callers can inspect
          // its status / code (e.g. to detect the 429 rate-limit response).
          throw error;
        }
      },
      async updatePassword(password) {
        if (!supabase) {
          throw new Error("Authentication is not configured yet.");
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          throw new Error(error.message || "Could not update your password.");
        }
      }
    }),
    [hasAgreedToTerms, isAgreementLoading, isLoading, session, supabase, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
