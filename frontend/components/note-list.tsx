"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/types/note";
import { NoteListSkeleton } from "@/components/note-list-skeleton";

type NoteListProps = {
  collapsePreviewCount?: number;
  emptyDescription?: string;
  emptyTitle?: string;
  highlightQuery?: string;
  isDeletingNoteId?: string | null;
  isLoading: boolean;
  notes: Note[];
  onDeleteNote?: (note: Note) => Promise<void>;
};

export function NoteList({
  collapsePreviewCount,
  emptyDescription = "Start with a single idea. Your notes will appear here as you add them.",
  emptyTitle = "No notes yet",
  highlightQuery = "",
  isDeletingNoteId = null,
  isLoading,
  notes,
  onDeleteNote
}: NoteListProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isDeletingFromSheet, setIsDeletingFromSheet] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const canCollapse =
    typeof collapsePreviewCount === "number" &&
    collapsePreviewCount > 0 &&
    notes.length > collapsePreviewCount;

  const visibleNotes = useMemo(() => {
    if (!canCollapse || expanded || typeof collapsePreviewCount !== "number") {
      return notes;
    }

    return notes.slice(0, collapsePreviewCount);
  }, [canCollapse, collapsePreviewCount, expanded, notes]);

  useEffect(() => {
    if (!canCollapse && expanded) {
      setExpanded(false);
    }
  }, [canCollapse, expanded]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openNoteActions = (note: Note) => {
    setActiveNote(note);
  };

  const handlePressStart = (note: Note) => {
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      ignoreClickRef.current = true;
      openNoteActions(note);
    }, 450);
  };

  const handleDelete = async () => {
    if (!activeNote || !onDeleteNote) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${activeNote.title}" permanently? This cannot be undone.`
    );

    if (!shouldDelete) {
      return;
    }

    setIsDeletingFromSheet(true);

    try {
      await onDeleteNote(activeNote);
      setActiveNote(null);
    } finally {
      setIsDeletingFromSheet(false);
    }
  };

  if (isLoading) {
    return <NoteListSkeleton />;
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-line bg-slate-50 px-6 py-12 text-center dark:bg-slate-900">
        <p className="text-lg font-medium text-ink dark:text-slate-100">{emptyTitle}</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      {canCollapse ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {visibleNotes.length} of {notes.length} notes.
          </p>
          <button
            type="button"
            onClick={() => setExpanded((currentValue) => !currentValue)}
            className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {expanded ? "Collapse all" : "Show all notes"}
          </button>
        </div>
      ) : null}

      <div className="grid gap-4">
        {visibleNotes.map((note) => (
          <button
            key={note.id}
            type="button"
            onPointerDown={() => handlePressStart(note)}
            onPointerUp={clearLongPressTimer}
            onPointerLeave={clearLongPressTimer}
            onPointerCancel={clearLongPressTimer}
            onClick={() => {
              clearLongPressTimer();

              if (ignoreClickRef.current) {
                ignoreClickRef.current = false;
                return;
              }

              openNoteActions(note);
            }}
            className="w-full rounded-[28px] border border-line bg-slate-50 px-5 py-5 text-left transition hover:border-slate-300 hover:bg-white dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-950"
          >
            <article>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-ink dark:text-slate-100">
                    {renderHighlightedText(note.title, highlightQuery)}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
                {typeof note.similarity === "number" ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {Math.max(0, Math.min(100, Math.round(note.similarity * 100)))}% match
                  </span>
                ) : null}
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                {renderHighlightedText(note.content || "No content yet.", highlightQuery)}
              </p>
              <div className="mt-4 flex items-center justify-end">
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent dark:bg-accent/20 dark:text-accent">
                  Open or delete
                </span>
              </div>
            </article>
          </button>
        ))}
      </div>

      {activeNote ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[28px] border border-line bg-white p-5 shadow-jotter dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-ink dark:text-slate-100">
              {activeNote.title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Choose what you want to do with this note.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveNote(null);
                  router.push(`/notes/${activeNote.id}`);
                }}
                className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                Open note
              </button>

              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={
                  !onDeleteNote ||
                  isDeletingFromSheet ||
                  isDeletingNoteId === activeNote.id
                }
                className="inline-flex items-center justify-center rounded-full border border-red-300 px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                {isDeletingFromSheet || isDeletingNoteId === activeNote.id
                  ? "Deleting..."
                  : "Delete note"}
              </button>

              <button
                type="button"
                onClick={() => setActiveNote(null)}
                className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function renderHighlightedText(text: string, query: string) {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 2)
    .slice(0, 5);

  if (terms.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    terms.some((term) => part.toLowerCase() === term.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-yellow-100 px-0.5 text-inherit dark:bg-amber-500/30"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
