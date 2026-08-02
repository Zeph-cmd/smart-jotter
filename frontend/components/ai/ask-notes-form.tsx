"use client";

import { FormEvent } from "react";

type AskNotesFormProps = {
  isAsking: boolean;
  onAsk: () => void;
  onQuestionChange: (question: string) => void;
  question: string;
};

export function AskNotesForm({
  isAsking,
  onAsk,
  onQuestionChange,
  question
}: AskNotesFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAsk();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <textarea
        rows={4}
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder="What do my notes say about...?"
        className="w-full rounded-3xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
      />

      <button
        type="submit"
        disabled={isAsking}
        className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {isAsking ? "Thinking..." : "Ask"}
      </button>
    </form>
  );
}
