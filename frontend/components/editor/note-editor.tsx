"use client";

import { useEffect, useState } from "react";
import { ComingSoonButton } from "@/components/ui/coming-soon-button";
import type { SuggestionAction } from "@/types/note";

type NoteEditorProps = {
  content: string;
  isSaving: boolean;
  onContentChange: (value: string) => void;
  onSave: () => void;
  onSuggest: (action: SuggestionAction) => void;
  saveStatusLabel: string;
  suggestionAction: SuggestionAction | null;
  title: string;
  onTitleChange: (value: string) => void;
};

const ACTIONS: Array<{
  action: SuggestionAction;
  label: string;
}> = [
  { action: "expand", label: "Expand" },
  { action: "simplify", label: "Simplify" },
  { action: "explain", label: "Explain" },
  { action: "improve", label: "Improve" }
];

export function NoteEditor({
  content,
  isSaving,
  onContentChange,
  onSave,
  onSuggest,
  saveStatusLabel,
  suggestionAction,
  title,
  onTitleChange
}: NoteEditorProps) {
  const [softHint, setSoftHint] = useState<string | null>(null);

  useEffect(() => {
    if (!content.trim()) {
      setSoftHint(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSoftHint(createSoftHint(content));
    }, 2500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [content]);

  return (
    <section className="rounded-[28px] border border-line bg-white p-5 shadow-jotter dark:bg-slate-900">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="editor-title">
            Title
          </label>
          <input
            id="editor-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
            placeholder="Untitled thought"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="editor-content">
            Note
          </label>
          <textarea
            id="editor-content"
            rows={18}
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            className="w-full rounded-[28px] border border-line bg-slate-50 px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
            placeholder="Write your note here..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((item) => (
            <ComingSoonButton
              key={item.action}
              label={item.label}
              isActive={suggestionAction === item.action}
              onClick={() => onSuggest(item.action)}
            />
          ))}
        </div>

        {softHint ? (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-100">
            {softHint}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isSaving ? "Saving..." : "Save changes"}
          </button>

          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{saveStatusLabel}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suggestions stay separate until you apply them.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function createSoftHint(content: string) {
  const normalizedContent = content.trim();

  if (normalizedContent.length < 90) {
    return null;
  }

  if (!/\bfor example\b|\be\.g\.\b|\bsuch as\b/i.test(normalizedContent)) {
    return "This could use an example to make the idea easier to reuse later.";
  }

  if (normalizedContent.length > 220) {
    return "Want to simplify this? A shorter version might be easier to scan later.";
  }

  return "You have a solid draft. An improvement pass could make the key point sharper.";
}