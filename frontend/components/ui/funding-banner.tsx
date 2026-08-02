"use client";

import { useState } from "react";

/**
 * A slim red banner shown app-wide. When clicked, it expands into a prominent
 * red panel explaining that the developer is currently funding the project
 * out-of-pocket and AI features are temporarily paused, with a short bulleted
 * note on the interim measures in place.
 *
 * Dismissable per-session (state only — intentionally resets on reload).
 */
export function FundingBanner() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-red-600/40 bg-red-600 text-white">
      {/* Slim clickable line */}
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        className="flex w-full items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider transition hover:bg-red-700 sm:text-sm"
        aria-expanded={isExpanded}
      >
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
        {isExpanded ? "Hide details" : "AI features are paused — tap for info"}
      </button>

      {/* Expanded explanation */}
      {isExpanded ? (
        <div className="border-t border-red-500/40 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              The developer doesn't have enough funds right now
            </h2>
            <p className="mt-2 text-sm text-red-100 sm:text-base">
              Smart Jotter's AI tools (search, summaries, Q&A) run on paid
              APIs. Until funding is sorted, those are on hold. Here's what
              still works:
            </p>
            <ul className="mx-auto mt-4 max-w-xl space-y-1.5 text-left text-sm text-red-50 sm:text-base">
              <li className="flex gap-2">
                <span aria-hidden="true">✓</span>
                Note-taking, editing, and saving work as normal.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">✓</span>
                Speech-to-text works on a free tier (90 min), then a manual MoMo plan.
              </li>
              <li className="flex gap-2">
                <span aria-hidden="true">✓</span>
                AI buttons remain visible but show "Coming soon" until re-enabled.
              </li>
            </ul>
            <p className="mt-4 text-xs text-red-200">
              To help bring the full AI layer back faster, use a paid speech plan or
              reach out via WhatsApp.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}