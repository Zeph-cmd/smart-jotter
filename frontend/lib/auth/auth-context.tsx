"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
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

// Storm-detector state: rolling window of TOKEN_REFRESHED event timestamps.
// Module scope so a churn loop can't hide by remounting. With the library as
// the single refresh owner (single-flight + backoff) a real storm should never
// occur; this exists only to log + disarm the refresher if one ever does.
let tokenRefreshTimestamps: number[] = [];
const REFRESH_STORM_THRESHOLD = 5;

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

    // Hard safety net: no matter what happens (network hung, an unhandled
    // rejection), never leave the app stuck on the loading skeleton forever.
    // After this many ms we force loading off so the user at least sees the
    // login screen and can retry.
    const LOADING_TIMEOUT_MS = 12_000;
    const loadingTimer = window.setTimeout(() => {
      setIsLoading(false);
    }, LOADING_TIMEOUT_MS);

    // Bootstrap: read the persisted session. getSession() NEVER refreshes —
    // it resolves instantly from storage. The library's auto-refresh engine
    // (forced on by @supabase/ssr) owns ALL token refreshes from here; we do
    // not race it with bespoke refresh logic (that race caused duplicate
    // /auth/v1/token storms after sign-in).
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        // Storage read failure — leave state as-is; the listener below still
        // resolves loading.
      })
      .finally(() => {
        setIsLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Storm detector: with the library as the single refresh owner
      // (single-flight + backoff) a healthy session refreshes at most a
      // couple of times per minute. Five or more TOKEN_REFRESHED events in a
      // 60s window means something unexpected is churning — log it loudly and
      // disarm the refresher. We deliberately do NOT sign the user out here:
      // with a still-valid session the app keeps working, and at worst the
      // token expires naturally and the user logs in once more. (The previous
      // auto-signOut turned a cosmetic storm into a login bounce.)
      if (event === "TOKEN_REFRESHED") {
        const now = Date.now();
        tokenRefreshTimestamps = tokenRefreshTimestamps.filter((t) => now - t < 60_000);
        tokenRefreshTimestamps.push(now);

        if (tokenRefreshTimestamps.length >= REFRESH_STORM_THRESHOLD) {
          console.error(
            "[auth] Refresh storm detected (" +
              `${tokenRefreshTimestamps.length} refreshes in 60s) — stopping auto-refresh`
          );
          tokenRefreshTimestamps = [];

          try {
            supabase.auth.stopAutoRefresh();
          } catch {
            /* ignore */
          }
        }
      }

      // When the session disappears (explicit sign-out, or the library giving
      // up on a refresh), clear the user so the UI returns to the login
      // screen rather than holding a stale session.
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
      window.clearTimeout(loadingTimer);
      subscription.unsubscribe();
    };
  }, [supabase]);

  // The signed-in user's id, as a PRIMITIVE. The agreement effect must depend
  // on this instead of the `user` object: supabase-js emits new user object
  // identities on auth events (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED),
  // and an object-identity dependency re-runs the effect on each one — its
  // cleanup cancels the in-flight fetch AND the fallback timer, after which
  // the same-user guard skipped re-fetching, leaving the agreement state stuck
  // at null and the UI on a permanent skeleton. With an id dependency the
  // effect runs only when the actual signed-in account changes.
  const userId = user?.id ?? null;

  // Load the terms-agreement state whenever the signed-in user id changes.
  // Reset to null on logout / loading so the gate treats it as "unknown".
  useEffect(() => {
    if (!supabase || !userId) {
      setHasAgreedToTerms(null);
      setIsAgreementLoading(false);
      return;
    }

    let isMounted = true;
    setIsAgreementLoading(true);

    // Safety net: never leave a signed-in user on the agreement loading
    // skeleton forever, even if the DB read hangs (e.g. network drop).
    const AGREEMENT_TIMEOUT_MS = 12_000;
    const agreementTimer = window.setTimeout(() => {
      if (isMounted) {
        // Unknown after timeout: only fall back to "not agreed" if the
        // status was never resolved. Never overwrite an acceptance recorded
        // this session.
        setHasAgreedToTerms((previous) => (previous === null ? false : previous));
        setIsAgreementLoading(false);
      }
    }, AGREEMENT_TIMEOUT_MS);

    const loadAgreement = async () => {
      const status = await getTermsAgreement();
      if (!isMounted) {
        return;
      }
      if (status) {
        setHasAgreedToTerms(status.agreed);
      } else {
        // Status unknown (network/API failure): keep an existing true (e.g.
        // the user just accepted); default to false only when unresolved.
        setHasAgreedToTerms((previous) => (previous === null ? false : previous));
      }
      setIsAgreementLoading(false);
    };

    void loadAgreement();

    return () => {
      isMounted = false;
      window.clearTimeout(agreementTimer);
    };
  }, [supabase, userId]);

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
        // users who haven't accepted terms yet, so Google sign-in flows
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
        // so the Promise resolves (and React state updates) are moot. The
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
