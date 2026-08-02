import type { SuggestionAction } from "@/types/note";

type SuggestionPanelProps = {
  action: SuggestionAction | null;
  error: string | null;
  isLoading: boolean;
  onApply: () => void;
  onDismiss: () => void;
  suggestion: string | null;
};

const ACTION_LABELS: Record<SuggestionAction, string> = {
  expand: "Expanded draft",
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
  if (!isLoading && !error && !suggestion) {
    return null;
  }

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
          <div className="mt-4 rounded-3xl border border-line bg-slate-50 px-4 py-4 dark:bg-slate-950">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
              {suggestion}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              Replace note content
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Smart Jotter never replaces your note until you choose to apply it.
            </p>
          </div>
        </>
      ) : null}
    </section>
  );
}
