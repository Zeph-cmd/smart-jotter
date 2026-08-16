import type { MetadataRoute } from "next";

/**
 * Dynamic sitemap for https://smartjotter.com.
 *
 * Only PUBLIC, non-authenticated marketing/info pages are listed. Routes that
 * require login (/notes, /usage, /learning, /payment/callback), auth utility
 * pages (/forgot-password, /reset-password), and API routes are intentionally
 * excluded.
 *
 * Note: the "View plans" banner is an in-page toggle rendered app-wide (see
 * components/ui/plans-banner.tsx); it does not link to a dedicated /pricing
 * or /plans route, so no separate plans entry exists here.
 */
const BASE_URL = "https://smartjotter.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${BASE_URL}/features`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8
    },
    {
      url: `${BASE_URL}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3
    }
  ];
}