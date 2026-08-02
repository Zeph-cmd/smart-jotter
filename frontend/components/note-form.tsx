"use client";

import { FormEvent, useState } from "react";
import { SpeechToTextButton } from "@/components/editor/speech-to-text-button";
import { createNoteRequest, transcribeAudioRequest } from "@/lib/notes-api";
import type { Note } from "@/types/note";

type NoteFormProps = {
  onCancel: () => void;
  onCreated: (note: Note) => void;
};

export function NoteForm({ onCancel, onCreated }: NoteFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await save(title, content);
  };

  const save = async (titleValue: string, contentValue: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const note = await createNoteRequest({
        title: titleValue,
        content: contentValue
      });
      onCreated(note);
      setTitle("");
      setContent("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not create note."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTranscribed = async (text: string) => {
    const prefix = content.trim() ? "\n\n" : "";
    const nextContent = `${content}${prefix}${text}`.trimStart();
    setContent(nextContent);

    // Auto-save once transcription lands.
    const effectiveTitle = title.trim() || "Voice note";
    await save(effectiveTitle, nextContent);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="note-title">
          Title
        </label>
        <input
          id="note-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Untitled thought"
          className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="note-content">
          Content
        </label>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write your note here..."
          rows={6}
          className="w-full rounded-3xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
        />
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-blue-500"
        >
          {isSubmitting ? "Saving..." : "Save Note"}
        </button>

        <SpeechToTextButton
          onTranscribe={(audio, durationSeconds) =>
            transcribeAudioRequest(audio, durationSeconds)
          }
          onTranscribed={(text) => {
            void handleTranscribed(text);
          }}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-300 dark:hover:bg-slate-800"
        />

        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}