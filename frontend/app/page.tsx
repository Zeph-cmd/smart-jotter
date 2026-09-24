import { HomeShell } from "@/components/home-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Smart Jotter — Minimal Notes with Real Intelligence",
  description:
    "Capture ideas quickly, search by meaning, and ask questions grounded in your own notes. AI-powered note-taking that stays out of your way."
});

/**
 * JSON-LD structured data (schema.org) for search engines.
 * Pricing mirrors lib/config/plans.ts: free tier, then paid plans in GHS
 * (African visitors) and USD (visitors elsewhere) at the fixed rate
 * GHS 50 -> USD 20, GHS 100 -> USD 40, across the Speech-to-Text and
 * AI Writing Assist tracks (same price points, never bundled).
 */
const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Smart Jotter",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description:
    "AI-powered note-taking app with semantic search, flashcards, and an intelligence layer grounded in your own notes.",
  url: "https://smartjotter.com",
  offers: [
    {
      "@type": "Offer",
      name: "Free tier",
      price: "0",
      priceCurrency: "GHS",
      description:
        "Core note-taking, semantic search, and free AI starter credits."
    },
    {
      "@type": "Offer",
      name: "Plan A (Ghana)",
      price: "50",
      priceCurrency: "GHS",
      description:
        "1-week plan granting Speech-to-Text recording time or 200 AI Writing Assist credits."
    },
    {
      "@type": "Offer",
      name: "Plan B (Ghana)",
      price: "100",
      priceCurrency: "GHS",
      description:
        "1-month plan granting Speech-to-Text recording time or 400 AI Writing Assist credits."
    },
    {
      "@type": "Offer",
      name: "Plan A (International)",
      price: "20",
      priceCurrency: "USD",
      description:
        "1-week plan granting Speech-to-Text recording time or 200 AI Writing Assist credits, charged in USD for visitors outside Africa."
    },
    {
      "@type": "Offer",
      name: "Plan B (International)",
      price: "40",
      priceCurrency: "USD",
      description:
        "1-month plan granting Speech-to-Text recording time or 400 AI Writing Assist credits, charged in USD for visitors outside Africa."
    }
  ]
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema)
        }}
      />
      <HomeShell />
    </>
  );
}
