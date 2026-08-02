import Link from "next/link";
import type { RelatedNote } from "@/types/note";

type RelatedNotesProps = {
  error: string | null;
  isLoading: boolean;
  notes: RelatedNote[];
};

export function RelatedNotes({ error, isLoading, notes }: RelatedNotesProps) {
  return (
    <section className="rounded-[28px] border border-line bg-white p-5 shadow-jotter dark:bg-slate-900">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Connected ideas
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">Related Notes</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Similar notes are linked quietly in the background to help you navigate ideas.
        </p>
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Looking for related notes...</p>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && notes.length === 0 ? (
        <div className="mt-5 rounded-3xl border border-dashed border-line bg-slate-50 px-4 py-5 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          Save a few notes and Smart Jotter will start surfacing connected ideas here.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        {notes.map((note) => (
          <Link
            key={note.id}
            href={`/notes/${note.id}`}
            className="rounded-3xl border border-line bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900"
          >
            <p className="text-sm font-semibold text-ink dark:text-slate-100">{note.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{note.preview}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
