"use client";

import { useEffect, useState } from "react";
import type { SuggestionAction } from "@/types/note";

type SuggestionApplyMode = "insert" | "replace";

type SuggestionPanelProps = {
  action: SuggestionAction | null;
  error: string | null;
  isLoading: boolean;
  onApply: (editedSuggestion: string, mode: SuggestionApplyMode) => void;
  onDismiss: () => void;
  suggestion: string | null;
};

const ACTION_LABELS: Record<SuggestionAction, string> = {
  explain: "Explanation",
  improve: "Improved draft",
  expand: "Expanded draft"
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
  const [copied, setCopied] = useState(false);

  // Sync local editable copy whenever a new suggestion arrives.
  useEffect(() => {
    if (suggestion) {
      setEditedSuggestion(suggestion);
      setCopied(false);
    }
  }, [suggestion]);

  if (!isLoading && !error && !suggestion) {
    return null;
  }

  const isEdited = suggestion !== null && editedSuggestion !== suggestion;

  // Expand only generates the added words, so replacing the whole note with
  // them makes no sense — offer Insert only, like the Android app.
  const showReplace = action !== "expand";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editedSuggestion);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (permissions, insecure context) — non-critical.
    }
  };

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
              onClick={() => onApply(editedSuggestion, "insert")}
              className="inline-flex items-center justify-center rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/10 dark:text-accent dark:hover:bg-accent/20"
            >
              Insert
            </button>
            {showReplace ? (
              <button
                type="button"
                onClick={() => onApply(editedSuggestion, "replace")}
                className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 dark:hover:bg-blue-500"
              >
                Replace
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleCopy()}
              aria-label="Copy suggestion"
              className="inline-flex items-center justify-center rounded-full border border-line px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {copied ? "Copied" : "Copy"}
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
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {isEdited
              ? "Your edited version will be applied."
              : "Insert appends to your note; Replace overwrites it."}
          </p>
        </>
      ) : null}
    </section>
  );
}
