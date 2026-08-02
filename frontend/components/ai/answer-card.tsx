"use client";

import Link from "next/link";
import { useState } from "react";
import type { Note } from "@/types/note";

type AnswerCardProps = {
  answer: string | null;
  isLoading: boolean;
  notes: Note[];
};

export function AnswerCard({ answer, isLoading, notes }: AnswerCardProps) {
  const [showSources, setShowSources] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-[28px] border border-dashed border-line bg-slate-50 px-5 py-8 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Thinking through your notes...
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="rounded-[28px] border border-dashed border-line bg-slate-50 px-5 py-8 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Ask a question and Smart Jotter will answer using the most relevant notes.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-line bg-slate-50 px-5 py-5 dark:bg-slate-900">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        Answer
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
        {answer}
      </p>

      {notes.length > 0 ? (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Based on {notes.length} note{notes.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={() => setShowSources((value) => !value)}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {showSources ? "Hide source notes" : "View source notes"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {notes.map((note) => (
              <span
                key={note.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {note.title}
              </span>
            ))}
          </div>

          {showSources ? (
            <div className="mt-4 grid gap-3">
              {notes.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="rounded-3xl border border-line bg-white px-4 py-4 transition hover:border-slate-300 dark:bg-slate-950 dark:hover:border-slate-700"
                >
                  <p className="text-sm font-semibold text-ink dark:text-slate-100">{note.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {createPreview(note.content)}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function createPreview(content: string) {
  const compactContent = content.replace(/\s+/g, " ").trim();

  if (!compactContent) {
    return "Empty note";
  }

  if (compactContent.length <= 180) {
    return compactContent;
  }

  return `${compactContent.slice(0, 180)}...`;
}
