import type { Metadata } from "next";

/**
 * Shared on-page SEO metadata builder for public marketing pages.
 *
 * Keeps every public page's <title>, meta description, and Open Graph tags
 * consistent and unique. Used via `export const metadata = buildMetadata(...)`
 * in each server component page under app/.
 *
 * NOTE: The default OG image at /public/smart-jotter-logo.png must exist in
 * the deployed site. Recommended OG image size is 1200x630px.
 */
const SITE_URL = "https://smartjotter.com";
const DEFAULT_OG_IMAGE = "/smart-jotter-logo.png";

type BuildMetadataOptions = {
  /** Unique page title, under 60 characters. */
  title: string;
  /** Unique page description, under 155 characters. */
  description: string;
  /** Page path beginning with "/" (e.g. "/features"). Omit for the home page. */
  path?: string;
};

export function buildMetadata({
  title,
  description,
  path
}: BuildMetadataOptions): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: path ? `${SITE_URL}${path}` : SITE_URL,
      siteName: "Smart Jotter",
      locale: "en_US",
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `Smart Jotter — ${title}`
        }
      ]
    }
  };
}
