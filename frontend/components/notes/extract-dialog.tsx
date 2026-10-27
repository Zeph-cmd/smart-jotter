"use client";

import { useRef, useState } from "react";
import {
  createNoteRequest,
  downscaleImage,
  extractFromFileRequest,
  updateNoteRequest
} from "@/lib/notes-api";
import type { Note } from "@/types/note";

type ExtractDialogProps = {
  onCreated: (note: Note) => void;
  onCancel: () => void;
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ExtractedFile = {
  text: string;
  source: "image" | "pdf";
  pages?: number;
};

/**
 * Import flow: upload an image (2 credits) or text-based PDF (1 credit),
 * preview the extracted text, then save it as a new note. After saving, a
 * "+" button lets the user append further extractions to the same note.
 */
export function ExtractDialog({ onCreated, onCancel }: ExtractDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedFile | null>(null);
  const [draftText, setDraftText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<Note | null>(null);

  function titleFromFileName(candidate: File) {
    const base = candidate.name.replace(/\.[^.]+$/, "").trim();
    return base || "Extracted note";
  }

  function validate(candidate: File): string | null {
    if (ALLOWED_IMAGE_TYPES.has(candidate.type)) {
      if (candidate.size > MAX_IMAGE_BYTES) {
        return "Image is too large (max 5MB). Try a screenshot of the section you need.";
      }
      return null;
    }
    if (candidate.type === "application/pdf") {
      if (candidate.size > MAX_PDF_BYTES) {
        return "PDF is too large (max 10MB). Split it and upload the parts you need.";
      }
      return null;
    }
    return "Unsupported file type. Please choose a JPG, PNG, WebP image, or a PDF.";
  }

  async function handleFilePicked(candidate: File) {
    setError(null);
    setExtracted(null);
    setDraftText("");

    const validationError = validate(candidate);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(candidate);
    setIsExtracting(true);

    try {
      const uploadFile =
        ALLOWED_IMAGE_TYPES.has(candidate.type)
          ? await downscaleImage(candidate)
          : candidate;
      const result = await extractFromFileRequest(uploadFile);
      setExtracted(result);
      setDraftText(result.text);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not extract text from this file."
      );
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleSaveNew() {
    if (!file || !draftText.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const note = await createNoteRequest({
        title: titleFromFileName(file),
        content: draftText.trim()
      });
      onCreated(note);
      setSavedNote(note);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not save the note."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAppend() {
    if (!savedNote || !draftText.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const nextContent = savedNote.content.trim()
        ? `${savedNote.content.trimEnd()}\n\n${draftText.trim()}`
        : draftText.trim();
      const updated = await updateNoteRequest(savedNote.id, {
        title: savedNote.title,
        content: nextContent
      });
      setSavedNote(updated);
      setExtracted(null);
      setDraftText("");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Could not append to the note."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const costHint = file?.type === "application/pdf" ? "1 credit" : "2 credits";

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-slate-50 p-4 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-slate-100">
            Extract from image or PDF
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Images cost 2 credits, text-based PDFs 1 credit. Scanned PDFs aren&apos;t
            supported — upload page images instead.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-accent hover:text-accent dark:text-slate-400"
        >
          Close
        </button>
      </div>

      {savedNote ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/40 dark:bg-emerald-500/10">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Saved as “{savedNote.title}”.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting || isSaving}
              className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              + Append another image/PDF
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-accent hover:text-accent dark:text-slate-300"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(event) => {
          const candidate = event.target.files?.[0];
          if (candidate) {
            void handleFilePicked(candidate);
          }
        }}
      />

      {!savedNote ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isExtracting}
          className="w-full rounded-2xl border border-dashed border-line bg-white px-4 py-6 text-sm text-slate-500 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900 dark:text-slate-400"
        >
          {isExtracting
            ? "Extracting text…"
            : file
              ? `${file.name} — change file`
              : "Choose an image or PDF (JPG, PNG, WebP, PDF)"}
        </button>
      ) : null}

      {isExtracting ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reading your file — this costs {costHint} once extraction succeeds.
        </p>
      ) : null}

      {extracted && !savedNote ? (
        <div className="space-y-3">
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500"
              htmlFor="extract-preview"
            >
              Extracted text{extracted.source === "pdf" && extracted.pages ? ` · ${extracted.pages} page${extracted.pages > 1 ? "s" : ""}` : ""} — edit if needed
            </label>
            <textarea
              id="extract-preview"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={8}
              className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSaveNew()}
            disabled={isSaving || !draftText.trim()}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isSaving ? "Saving…" : "Save as new note"}
          </button>
        </div>
      ) : null}

      {savedNote && extracted ? (
        <div className="space-y-3">
          <div>
            <label
              className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500"
              htmlFor="extract-append-preview"
            >
              New text to append — edit if needed
            </label>
            <textarea
              id="extract-append-preview"
              value={draftText}
              onChange={(event) => setDraftText(event.target.value)}
              rows={6}
              className="mt-1 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-accent dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleAppend()}
            disabled={isSaving || !draftText.trim()}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isSaving ? "Appending…" : "Append to note"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
