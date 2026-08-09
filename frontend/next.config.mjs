/** @type {import('next').NextConfig} */

/**
 * Security headers applied to every response.
 *
 * These mitigate common web risks (OWASP):
 *  - Strict-Transport-Security: forces HTTPS, blocks SSL stripping.
 *  - X-Content-Type-Options: prevents MIME sniffing.
 *  - X-Frame-Options: clickjacking / iframe embedding defense.
 *  - Referrer-Policy: limits referrer leakage to same-origin only.
 *  - Permissions-Policy: disables sensitive browser APIs we don't use.
 *  - Content-Security-Policy: restricts resource origins. Paystack's inline
 *    JS popup is loaded from js.paystack.co, styles from paystack.com, opens
 *    a checkout iframe at checkout.paystack.com, and calls api.paystack.co.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    // microphone=self is REQUIRED — the app's speech-to-text feature needs it.
    value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()"
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Allow Paystack's inline popup + iframe checkout. Only the exact
      // origins Paystack needs are whitelisted; everything else stays locked
      // down to 'self' so unrelated third-party scripts/styles are blocked.
      "script-src 'self' 'unsafe-inline' https://js.paystack.co",
      "frame-src 'self' https://js.paystack.co https://checkout.paystack.com",
      "connect-src 'self' https://api.paystack.co https://*.supabase.co",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https://paystack.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join("; ")
  }
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;