"use client";

import { useState } from "react";

/**
 * A slim banner shown app-wide while Smart Jotter is in early access.
 *
 * AI features (Simplify, Improve, Explain, Semantic Search, Ask Your Notes)
 * are now FUNCTIONAL. Every new account gets 60 starter credits as a limited
 * early-access gift. This banner frames that generosity — it is NOT a permanent
 * free tier. Once credits run out, users are prompted to subscribe via MoMo.
 *
 * Dismissable per-session (state only — intentionally resets on reload).
 */
export function FundingBanner() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-emerald-600/40 bg-emerald-600 text-white">
      {/* Slim clickable line */}
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider transition hover:bg-emerald-700 sm:text-sm"
        aria-expanded={isExpanded}
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
        {isExpanded ? "Hide details" : "AI features are live — 60 free credits inside"}
      </button>

      {/* Expanded explanation */}
      {isExpanded ? (
        <div className="border-t border-emerald-500/40 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              You've got 60 free credits to try Smart Jotter's AI
            </h2>
            <p className="mt-2 text-sm text-emerald-50 sm:text-base">
              A limited early-access gift while we're getting started. Use
              your credits across any of these features:
            </p>
            <ul className="mx-auto mt-4 max-w-xl space-y-1.5 text-left text-sm text-emerald-50 sm:text-base">
              <li className="flex gap-2">
                <span aria-hidden="true">✦</span>
                <span>
                  <strong>Simplify, Improve, Explain</strong> — rewrite tools
                  in the note editor (1 credit each).
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">✦</span>
                <span>
                  <strong>Semantic Search</strong> — find notes by meaning, not
                  keywords (1 credit).
                </span>
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">✦</span>
                <span>
                  <strong>Ask Your Notes</strong> — get answers grounded in your
                  own notes (2 credits).
                </span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-emerald-100">
              More credits available soon via subscription. Once your starter
              credits run out, you'll see a quick prompt to upgrade through
              MoMo/WhatsApp.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}