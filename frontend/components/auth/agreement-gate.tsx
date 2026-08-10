"use client";

import { type ReactNode } from "react";
import { AgreementScreen } from "@/components/auth/agreement-screen";
import { useAuth } from "@/lib/auth/auth-context";

type AgreementGateProps = {
  children: ReactNode;
  /** Shown while the terms-agreement status is being resolved. */
  loadingFallback: ReactNode;
};

/**
 * Wraps protected page content to enforce the terms agreement.
 *
 * - Logged-out / auth-loading users pass through (the parent page renders its
 *   own auth UI / loading state).
 * - Signed-in users whose agreement status is still loading see `loadingFallback`.
 * - Signed-in users who haven't accepted see the AgreementScreen.
 * - Everyone else (agreed = true) sees the children.
 */
export function AgreementGate({ children, loadingFallback }: AgreementGateProps) {
  const {
    isLoading: isAuthLoading,
    isAgreementLoading,
    hasAgreedToTerms,
    user
  } = useAuth();

  // Only gate signed-in users whose auth has resolved. Logged-out users see
  // whatever the parent renders (typically AuthPanel or a sign-in prompt).
  if (isAuthLoading || !user) {
    return <>{children}</>;
  }

  if (isAgreementLoading || hasAgreedToTerms === null) {
    return <>{loadingFallback}</>;
  }

  if (!hasAgreedToTerms) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <AgreementScreen />
        </div>
      </main>
    );
  }

  return <>{children}</>;
}