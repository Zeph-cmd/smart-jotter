/**
 * Global feature flags for Smart Jotter.
 *
 * AI-powered features (Simplify, Semantic search, Ask your notes, Expand,
 * Improve, Explain) are gated behind this single flag. When `false`, the
 * buttons remain visible but are greyed out and show a "Coming soon" message
 * when clicked. The underlying API routes and logic stay fully intact — only
 * the UI is gated.
 *
 * Flip this to `true` to enable all AI features for launch.
 */
export const FEATURES_ENABLED = true;

/**
 * Returns true if the premium AI features should be interactive.
 * Centralised here so every component reads from the same source of truth.
 */
export function areFeaturesEnabled(): boolean {
  return FEATURES_ENABLED;
}