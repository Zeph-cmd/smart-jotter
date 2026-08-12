"use client";

import { useEffect, useState } from "react";
import type { SuggestionAction } from "@/types/note";

type SuggestionPanelProps = {
  action: SuggestionAction | null;
  error: string | null;
  isLoading: boolean;
  onApply: (editedSuggestion: string) => void;
  onDismiss: () => void;
  suggestion: string | null;
};

const ACTION_LABELS: Record<SuggestionAction, string> = {
  simplify: "Simplified draft",
  explain: "Explanation",
  improve: "Improved draft"
};

export function SuggestionPanel({
  action,
  error,
  isLoading,
  onApply,
  onDismiss,
  suggestion
}: SuggestionPanelProps) {
  const [editedSuggestion, setEditedSuggestion] = useState("");

  // Sync local editable copy whenever a new suggestion arrives.
  useEffect(() => {
    if (suggestion) {
      setEditedSuggestion(suggestion);
    }
  }, [suggestion]);

  if (!isLoading && !error && !suggestion) {
    return null;
  }

  const isEdited = suggestion !== null && editedSuggestion !== suggestion;

  return (
    <section className="rounded-[28px] border border-line bg-white p-5 shadow-jotter dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Writing assist
          </p>
          <h3 className="mt-2 text-lg font-semibold text-ink dark:text-slate-100">
            {action ? ACTION_LABELS[action] : "Suggestion"}
          </h3>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Close
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Generating a concise suggestion...</p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {suggestion ? (
        <>
          <div className="mt-4 rounded-3xl border border-line bg-slate-50 px-4 py-3 dark:bg-slate-950">
            <textarea
              value={editedSuggestion}
              onChange={(event) => setEditedSuggestion(event.target.value)}
              rows={Math.min(14, Math.max(4, editedSuggestion.split("\n").length + 1))}
              className="w-full resize-y rounded-2xl border border-transparent bg-transparent px-2 py-2 text-sm leading-7 text-slate-700 outline-none transition focus:border-accent dark:text-slate-200"
              aria-label="Editable suggestion"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onApply(editedSuggestion)}
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              {isEdited ? "Apply edited version" : "Replace note content"}
            </button>
            {isEdited ? (
              <button
                type="button"
                onClick={() => setEditedSuggestion(suggestion)}
                className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Reset
              </button>
            ) : null}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Edit the suggestion before applying, or apply as-is. Your note is never replaced until you choose.
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}