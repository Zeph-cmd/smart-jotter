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
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level guard so the visibilitychange refresh handler never overlaps
// with the bootstrap refresh or with itself (e.g. rapid tab switches).
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

    const loadSession = async () => {
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
            const { error: refreshError } = await supabase.auth.refreshSession();
            failed = Boolean(refreshError);
          } else {
            const { error: userError } = await supabase.auth.getUser();
            failed = Boolean(userError);
          }

          if (failed) {
            // scope: "local" avoids an extra (failing) server revocation call
            // — the token is already bad. It clears cookies/storage so the
            // client holds no dead credentials.
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
        // safe to the logged-out state so the app is never stuck loading.
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    void loadSession();

    // Because autoRefreshToken is off, refresh the session once when the user
    // returns to the tab IF the token is near expiry. This keeps long-lived
    // tabs working without re-introducing a background retry loop. The
    // module-level `isRefreshing` guard prevents overlapping refreshes.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible" || isRefreshing) {
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
        // The reset route is /reset-password and MUST be listed in Supabase's
        // allowed redirect URLs (Dashboard > Auth > URL Configuration).
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
