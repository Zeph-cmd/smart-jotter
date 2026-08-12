"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgreementScreen } from "@/components/auth/agreement-screen";
import { AuthPanel } from "@/components/auth/auth-panel";
import { NoteEditor } from "@/components/editor/note-editor";
import { RelatedNotes } from "@/components/editor/related-notes";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ApiRequestError,
  fetchNoteRequest,
  fetchRelatedNotesRequest,
  requestFlashcardsPreview,
  requestSuggestion,
  updateNoteRequest
} from "@/lib/notes-api";
import { FlashcardPreview } from "@/components/editor/flashcard-preview";
import { SubscriptionPrompt } from "@/components/ui/subscription-prompt";
import type {
  FlashcardPair,
  Note,
  RelatedNote,
  SuggestionAction
} from "@/types/note";

const SuggestionPanel = dynamic(
  () =>
    import("@/components/ai/suggestion-panel").then(
      (module) => module.SuggestionPanel
    )
);

const AUTOSAVE_DELAY_MS = 1400;

type NoteEditorPageProps = {
  noteId: string;
};

type DraftPayload = {
  content: string;
  title: string;
};

export function NoteEditorPage({ noteId }: NoteEditorPageProps) {
  const {
    isLoading: isAuthLoading,
    isAgreementLoading,
    hasAgreedToTerms,
    user
  } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatusLabel, setSaveStatusLabel] = useState("Saved");
  const [relatedNotes, setRelatedNotes] = useState<RelatedNote[]>([]);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const [isRelatedLoading, setIsRelatedLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionAction, setSuggestionAction] = useState<SuggestionAction | null>(
    null
  );
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [flashcards, setFlashcards] = useState<FlashcardPair[]>([]);
  const [flashcardsError, setFlashcardsError] = useState<string | null>(null);
  const [isFlashcardsLoading, setIsFlashcardsLoading] = useState(false);
  const [hasLoadedNote, setHasLoadedNote] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const lastSavedRef = useRef<DraftPayload>({ title: "", content: "" });

  const draftKey = useMemo(() => `smart-jotter:draft:${noteId}`, [noteId]);
  const exportBasePath = `/api/notes/${noteId}/export`;
  const hasUnsavedChanges =
    title !== lastSavedRef.current.title || content !== lastSavedRef.current.content;

  const loadRelatedNotes = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsRelatedLoading(true);
    setRelatedError(null);

    try {
      const notes = await fetchRelatedNotesRequest(noteId);
      setRelatedNotes(notes);
    } catch (caughtError) {
      setRelatedError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load related notes."
      );
    } finally {
      setIsRelatedLoading(false);
    }
  }, [noteId, user]);

  const saveNote = useCallback(
    async (
      silent = false,
      override?: { title?: string; content?: string }
    ) => {
      const effectiveTitle = override?.title ?? title;
      const effectiveContent = override?.content ?? content;

      if (!effectiveTitle.trim()) {
        setSaveError("Title is required.");
        setSaveStatusLabel("Missing title");
        return;
      }

      setIsSaving(true);
      setSaveError(null);
      setSaveStatusLabel("Saving...");

      try {
        const updatedNote = await updateNoteRequest(noteId, {
          title: effectiveTitle,
          content: effectiveContent
        });

        setNote(updatedNote);
        lastSavedRef.current = {
          title: updatedNote.title,
          content: updatedNote.content
        };
        clearDraft(draftKey);
        setSaveStatusLabel("Saved");

        if (!silent) {
          await loadRelatedNotes();
        } else {
          void loadRelatedNotes();
        }
      } catch (caughtError) {
        setSaveError(
          caughtError instanceof Error ? caughtError.message : "Could not save note."
        );
        setSaveStatusLabel("Save failed");
      } finally {
        setIsSaving(false);
      }
    },
    [content, draftKey, loadRelatedNotes, noteId, title]
  );

  useEffect(() => {
    if (
      isAuthLoading ||
      !user ||
      isAgreementLoading ||
      !hasAgreedToTerms
    ) {
      return;
    }

    const loadPage = async () => {
      setIsLoading(true);
      setError(null);
      setIsRelatedLoading(true);
      setRelatedError(null);

      try {
        const currentNote = await fetchNoteRequest(noteId);
        const draft = readDraft(draftKey);
        const nextTitle = draft?.title ?? currentNote.title;
        const nextContent = draft?.content ?? currentNote.content;

        setNote(currentNote);
        setTitle(nextTitle);
        setContent(nextContent);
        lastSavedRef.current = {
          title: currentNote.title,
          content: currentNote.content
        };
        setSaveStatusLabel(draft ? "Recovered local draft" : "Saved");
        setHasLoadedNote(true);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : "Could not load note."
        );
      } finally {
        setIsLoading(false);
      }

      try {
        const notes = await fetchRelatedNotesRequest(noteId);
        setRelatedNotes(notes);
      } catch (caughtError) {
        setRelatedError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load related notes."
        );
      } finally {
        setIsRelatedLoading(false);
      }
    };

    void loadPage();
  }, [
    draftKey,
    hasAgreedToTerms,
    isAgreementLoading,
    isAuthLoading,
    noteId,
    user
  ]);

  useEffect(() => {
    if (!hasLoadedNote) {
      return;
    }

    writeDraft(draftKey, { title, content });
    setSaveStatusLabel(hasUnsavedChanges ? "Unsaved changes" : "Saved");
  }, [content, draftKey, hasLoadedNote, hasUnsavedChanges, title]);

  useEffect(() => {
    if (!hasLoadedNote || !hasUnsavedChanges || !title.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveNote(true);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [content, hasLoadedNote, hasUnsavedChanges, saveNote, title]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleSuggest = async (action: SuggestionAction) => {
    if (!content.trim()) {
      setSuggestionError("Write something first so Smart Jotter has context.");
      setSuggestion(null);
      setSuggestionAction(action);
      return;
    }

    setSuggestionAction(action);
    setIsSuggestionLoading(true);
    setSuggestionError(null);

    try {
      const nextSuggestion = await requestSuggestion({ action, content });
      setSuggestion(nextSuggestion);
    } catch (caughtError) {
      setSuggestion(null);
      // 402 = out of credits → surface the subscription/MoMo prompt.
      if (caughtError instanceof ApiRequestError && caughtError.status === 402) {
        setShowSubscription(true);
        setSuggestionError(null);
      } else {
        setSuggestionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not generate a suggestion."
        );
      }
    } finally {
      setIsSuggestionLoading(false);
    }
  };

  const handleApplySuggestion = (editedSuggestion?: string) => {
    const finalContent = editedSuggestion ?? suggestion;

    if (!finalContent) {
      return;
    }

    setContent(finalContent);
  };

  const handleDismissSuggestion = () => {
    setSuggestion(null);
    setSuggestionAction(null);
    setSuggestionError(null);
    setIsSuggestionLoading(false);
  };

  const handleGenerateFlashcards = async () => {
    if (!content.trim()) {
      setFlashcardsError("Write something first so Smart Jotter has context.");
      setFlashcards([]);
      return;
    }

    setIsFlashcardsLoading(true);
    setFlashcardsError(null);

    try {
      const pairs = await requestFlashcardsPreview(content);
      setFlashcards(pairs);
    } catch (caughtError) {
      setFlashcards([]);
      // 402 = out of credits → surface the subscription/MoMo prompt.
      if (caughtError instanceof ApiRequestError && caughtError.status === 402) {
        setShowSubscription(true);
        setFlashcardsError(null);
      } else {
        setFlashcardsError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not generate flashcards."
        );
      }
    } finally {
      setIsFlashcardsLoading(false);
    }
  };

  const handleDismissFlashcards = () => {
    setFlashcards([]);
    setFlashcardsError(null);
    setIsFlashcardsLoading(false);
  };

  if (isAuthLoading) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-line bg-white p-8 shadow-jotter dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading your workspace...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <AuthPanel />
        </div>
      </main>
    );
  }

  // Terms-agreement gate: signed-in users must accept before accessing notes.
  if (isAgreementLoading || hasAgreedToTerms === null) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-line bg-white p-8 shadow-jotter dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading your workspace...</p>
        </div>
      </main>
    );
  }

  if (!hasAgreedToTerms) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <AgreementScreen />
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-line bg-white p-8 shadow-jotter dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading note...</p>
        </div>
      </main>
    );
  }

  if (error || !note) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-red-200 bg-white p-8 shadow-jotter dark:border-red-500/40 dark:bg-slate-900">
          <p className="text-sm text-red-700">{error ?? "Note not found."}</p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Back to notes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Back to notes
            </Link>
            <Link
              href="/features"
              className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Features
            </Link>
            <a
              href="#note-editor"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 dark:hover:bg-blue-500"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                fill="currentColor"
              >
                <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" />
              </svg>
              Edit note
            </a>
            <Link
              href={`/learning/${noteId}`}
              className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Learning Mode
            </Link>
            <a
              href={`${exportBasePath}?format=md`}
              download
              className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Export .md
            </a>
            <a
              href={`${exportBasePath}?format=txt`}
              download
              className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Export .txt
            </a>
          </div>
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Note workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink dark:text-slate-100">
              {title || note.title}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Last saved note from {new Date(note.created_at).toLocaleString()}.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-6">
            <NoteEditor
              content={content}
              isSaving={isSaving}
              onContentChange={setContent}
              onSave={() => void saveNote()}
              onSuggest={handleSuggest}
              onTitleChange={setTitle}
              saveStatusLabel={saveStatusLabel}
              suggestionAction={suggestionAction}
              title={title}
              onGenerateFlashcards={() => void handleGenerateFlashcards()}
              isGeneratingFlashcards={isFlashcardsLoading}
            />

            {(isFlashcardsLoading || flashcards.length > 0 || flashcardsError) ? (
              <FlashcardPreview
                flashcards={flashcards}
                isLoading={isFlashcardsLoading}
                error={flashcardsError}
                onDismiss={handleDismissFlashcards}
                onRegenerate={() => void handleGenerateFlashcards()}
              />
            ) : null}

            {saveError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {saveError}
              </div>
            ) : null}

            <SuggestionPanel
              action={suggestionAction}
              error={suggestionError}
              isLoading={isSuggestionLoading}
              onApply={handleApplySuggestion}
              onDismiss={handleDismissSuggestion}
              suggestion={suggestion}
            />
          </div>

          <RelatedNotes
            error={relatedError}
            isLoading={isRelatedLoading}
            notes={relatedNotes}
          />
        </section>
      </div>

      <SubscriptionPrompt
        isOpen={showSubscription}
        onClose={() => setShowSubscription(false)}
        variant="ai"
      />
    </main>
  );
}

function readDraft(key: string): DraftPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as DraftPayload;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: DraftPayload) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(draft));
}

function clearDraft(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}