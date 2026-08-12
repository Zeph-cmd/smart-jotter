import Link from "next/link";
import type { Note } from "@/types/note";
import { NoteListSkeleton } from "@/components/note-list-skeleton";

type NoteListProps = {
  emptyDescription?: string;
  emptyTitle?: string;
  highlightQuery?: string;
  isLoading: boolean;
  notes: Note[];
};

export function NoteList({
  emptyDescription = "Start with a single idea. Your notes will appear here as you add them.",
  emptyTitle = "No notes yet",
  highlightQuery = "",
  isLoading,
  notes
}: NoteListProps) {
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
    <div className="grid gap-4">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`} className="block">
          <article className="rounded-[28px] border border-line bg-slate-50 px-5 py-5 transition hover:border-slate-300 hover:bg-white dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-950">
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
              Edit note
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="currentColor"
              >
                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" />
              </svg>
            </span>
          </div>
          </article>
        </Link>
      ))}
    </div>
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
