import { NextResponse } from "next/server";

/**
 * GET /api/geo
 *
 * Returns the pricing currency for the current visitor based on their country.
 *
 * Country detection uses the CDN geo headers set by the hosting platform
 * (Vercel: x-vercel-ip-country; Cloudflare: cf-ipcountry). No third-party
 * IP lookups, no PII stored.
 *
 *  - African countries  -> GHS (Paystack Ghana, primary market)
 *  - Everything else    -> USD (fixed rate, see lib/config/plans.ts)
 *  - Unknown (local dev, missing header) -> GHS (safe default)
 */

/** ISO 3166-1 alpha-2 codes for all 54 African countries. */
const AFRICAN_COUNTRIES = new Set([
  "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG",
  "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN",
  "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ",
  "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD",
  "TZ", "TG", "TN", "UG", "ZM", "ZW"
]);

export function GET(request: Request) {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;

  const upper = country ? country.toUpperCase() : null;
  const detected = Boolean(upper);

  // Non-African visitors are priced in USD; African and unknown visitors
  // default to GHS.
  const currency = upper && !AFRICAN_COUNTRIES.has(upper) ? "USD" : "GHS";

  return NextResponse.json(
    { country: upper, currency, detected },
    { headers: { "Cache-Control": "no-store" } }
  );
}
