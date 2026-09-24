"use client";

import { useEffect, useState } from "react";
import type { PricingCurrency } from "@/lib/config/plans";

/**
 * Resolves the pricing currency for the current visitor.
 *
 * Fetches /api/geo once (Vercel/Cloudflare geo header based), caches the
 * result in sessionStorage for the tab session, and defaults to "GHS" while
 * loading or on failure — so Ghanaian users see correct prices immediately
 * and international users see USD as soon as detection completes.
 */
export function usePricingCurrency(): PricingCurrency {
  const [currency, setCurrency] = useState<PricingCurrency>("GHS");

  useEffect(() => {
    let active = true;

    try {
      const stored = sessionStorage.getItem("sj-pricing-currency");
      if (stored === "GHS" || stored === "USD") {
        setCurrency(stored);
        return;
      }
    } catch {
      // sessionStorage unavailable (private mode) — fetch below still works.
    }

    fetch("/api/geo")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { currency?: string; detected?: boolean } | null) => {
        if (!active || !data) return;
        const resolved: PricingCurrency =
          data.currency === "USD" && data.detected ? "USD" : "GHS";
        setCurrency(resolved);
        try {
          sessionStorage.setItem("sj-pricing-currency", resolved);
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // Keep GHS default on network failure.
      });

    return () => {
      active = false;
    };
  }, []);

  return currency;
}
