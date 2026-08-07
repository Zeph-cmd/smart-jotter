/**
 * Central credit-cost definitions for Smart Jotter's AI features.
 *
 * Every AI feature charges a fixed number of credits before it runs. These
 * constants are the single source of truth — both the gating logic and the
 * usage page import from here so costs can never drift between the UI and the
 * backend.
 *
 * NOTE: Actual OpenAI calls remain disabled behind FEATURES_ENABLED
 * (see lib/config/features.ts). This module only defines costs; it does not
 * enable billing.
 */

/** The five AI features that consume credits. */
export type AiFeature =
  | "simplify"
  | "improve"
  | "explain"
  | "semantic_search"
  | "ask_notes";

/**
 * Credit cost per AI feature. Adjust these values here and every gate, log,
 * and usage display updates automatically.
 */
export const FEATURE_CREDIT_COSTS: Record<AiFeature, number> = {
  simplify: 1,
  improve: 1,
  explain: 1,
  semantic_search: 1,
  ask_notes: 2
};

/**
 * Returns the credit cost for a given feature. Falls back to 0 for unknown
 * features so callers can fail safe (never silently charge for something we
 * don't recognise).
 */
export function getFeatureCost(feature: AiFeature): number {
  return FEATURE_CREDIT_COSTS[feature] ?? 0;
}

/**
 * Maps the editor suggestion actions (which include "expand") to credit-
 * bearing AI features. "expand" is not in the credit system defined here, so
 * it maps to null and is skipped by the credit gate.
 */
export function suggestionActionToFeature(
  action: string
): AiFeature | null {
  switch (action) {
    case "simplify":
      return "simplify";
    case "improve":
      return "improve";
    case "explain":
      return "explain";
    default:
      return null;
  }
}

/**
 * Human-readable labels for each feature, used on the usage page.
 */
export const FEATURE_LABELS: Record<AiFeature, string> = {
  simplify: "Simplify",
  improve: "Improve",
  explain: "Explain",
  semantic_search: "Semantic Search",
  ask_notes: "Ask Your Notes"
};