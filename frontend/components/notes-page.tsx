"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthStatus } from "@/components/auth/auth-status";
import { NoteForm } from "@/components/note-form";
import { NoteList } from "@/components/note-list";
import { ComingSoonOverlay } from "@/components/ui/coming-soon-overlay";
import { SubscriptionPrompt } from "@/components/ui/subscription-prompt";
import { useAuth } from "@/lib/auth/auth-context";
import { areFeaturesEnabled } from "@/lib/config/features";
import {
  ApiRequestError,
  askNotesRequest,
  fetchNotes,
  searchNotesRequest
} from "@/lib/notes-api";
import type { Note } from "@/types/note";

const AnswerCard = dynamic(
  () => import("@/components/ai/answer-card").then((module) => module.AnswerCard)
);
const AskNotesForm = dynamic(
  () =>
    import("@/components/ai/ask-notes-form").then((module) => module.AskNotesForm)
);
const SemanticSearchForm = dynamic(
  () =>
    import("@/components/ai/semantic-search-form").then(
      (module) => module.SemanticSearchForm
    )
);

const SEARCH_DEBOUNCE_MS = 400;

type CachedNotesPayload = {
  notes: Note[];
  savedAt: number;
};

export function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [displayedNotes, setDisplayedNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [askQuestion, setAskQuestion] = useState("");
  const [askError, setAskError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerSources, setAnswerSources] = useState<Note[]>([]);
  const [showSubscription, setShowSubscription] = useState(false);
  const searchCacheRef = useRef(new Map<string, Note[]>());
  const notesCacheKey = useMemo(
    () => `smart-jotter:notes-cache:${user?.id ?? "guest"}`,
    [user?.id]
  );

  const runSearch = useCallback(
    async (query: string) => {
      if (searchCacheRef.current.has(query)) {
        setDisplayedNotes(searchCacheRef.current.get(query) ?? []);
        setIsSearchActive(true);
        return;
      }

      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await searchNotesRequest(query);
        searchCacheRef.current.set(query, results);
        setDisplayedNotes(results);
        setIsSearchActive(true);
      } catch (caughtError) {
        // 402 = out of credits → surface the subscription/MoMo prompt.
        if (caughtError instanceof ApiRequestError && caughtError.status === 402) {
          setShowSubscription(true);
          setSearchError(null);
        } else {
          setSearchError(
            caughtError instanceof Error ? caughtError.message : "Could not search notes."
          );
        }
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  useEffect(() => {
    const cachedNotes = readNotesCache(notesCacheKey);

    if (cachedNotes.length > 0) {
      setNotes(cachedNotes);
      setDisplayedNotes(cachedNotes);
      setIsLoading(false);
    }

    const loadNotes = async () => {
      try {
        const data = await fetchNotes();
        setNotes(data);
        setDisplayedNotes(data);
        writeNotesCache(notesCacheKey, data);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load your notes."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadNotes();
  }, [notesCacheKey]);

  useEffect(() => {
    const normalizedQuery = searchQuery.trim();

    if (!normalizedQuery) {
      setDisplayedNotes(notes);
      setIsSearchActive(false);
      setSearchError(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runSearch(normalizedQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notes, runSearch, searchQuery]);

  const isSearchVisible = useMemo(
    () => isSearchActive && searchQuery.trim().length > 0,
    [isSearchActive, searchQuery]
  );

  const handleNoteCreated = (note: Note) => {
    setNotes((currentNotes) => {
      const nextNotes = [note, ...currentNotes];

      if (!isSearchVisible) {
        setDisplayedNotes(nextNotes);
      }

      searchCacheRef.current.clear();
      writeNotesCache(notesCacheKey, nextNotes);
      return nextNotes;
    });
    setShowForm(false);
    setError(null);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setDisplayedNotes(notes);
    setIsSearchActive(false);
    setSearchError(null);
  };

  const handleAsk = async () => {
    const question = askQuestion.trim();

    if (!question) {
      setAskError("Enter a question to ask your notes.");
      return;
    }

    setIsAsking(true);
    setAskError(null);

    try {
      const result = await askNotesRequest(question);
      setAnswer(result.answer);
      setAnswerSources(result.notes);
    } catch (caughtError) {
      // 402 = out of credits → surface the subscription/MoMo prompt.
      if (caughtError instanceof ApiRequestError && caughtError.status === 402) {
        setShowSubscription(true);
        setAskError(null);
      } else {
        setAskError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not answer from your notes."
        );
      }
    } finally {
      setIsAsking(false);
    }
  };
  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Smart Jotter
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100">
                Minimal notes with a real intelligence layer.
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
                Capture ideas quickly, search by meaning, and ask questions grounded
                in your own notes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <AuthStatus />
              <Link
                href="/features"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent dark:bg-slate-900 dark:text-slate-100 dark:hover:border-accent dark:hover:text-accent"
              >
                Features
              </Link>
              <Link
                href="/usage"
                className="inline-flex items-center justify-center rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent dark:bg-slate-900 dark:text-slate-100 dark:hover:border-accent dark:hover:text-accent"
              >
                Usage
              </Link>
              <button
                type="button"
                onClick={() => setShowForm((currentValue) => !currentValue)}
                className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {showForm ? "Close" : "New Note"}
              </button>
            </div>
          </div>

          {showForm ? (
            <div className="mt-8 border-t border-line pt-6">
              <NoteForm onCreated={handleNoteCreated} onCancel={() => setShowForm(false)} />
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
            <div className="mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-ink dark:text-slate-100">Semantic search</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Early access · 1 credit
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Search by meaning instead of exact keywords. Results update as you type.
              </p>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                You've got 60 free credits to try this — a limited early-access gift while we're getting started. More available soon via subscription.
              </p>
            </div>

            <SemanticSearchForm
              query={searchQuery}
              isSearching={isSearching}
              onClear={handleClearSearch}
              onQueryChange={setSearchQuery}
              onSearch={() => void runSearch(searchQuery.trim())}
            />

            {searchError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {searchError}
              </div>
            ) : null}

            {!areFeaturesEnabled() ? <ComingSoonOverlay /> : null}
          </div>

          <div className="relative rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
            <div className="mb-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold text-ink dark:text-slate-100">Ask your notes</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Early access · 2 credits
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Get a concise answer based only on the notes you have saved.
              </p>
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                You've got 60 free credits to try this — a limited early-access gift while we're getting started. More available soon via subscription.
              </p>
            </div>

            <AskNotesForm
              isAsking={isAsking}
              onAsk={handleAsk}
              onQuestionChange={setAskQuestion}
              question={askQuestion}
            />

            {askError ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {askError}
              </div>
            ) : null}

            <div className="mt-5">
              <AnswerCard answer={answer} isLoading={isAsking} notes={answerSources} />
            </div>

            {!areFeaturesEnabled() ? <ComingSoonOverlay /> : null}
          </div>
        </section>

        <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-ink dark:text-slate-100">
                {isSearchVisible ? "Search results" : "Your notes"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {isSearchVisible
                  ? "Closest matches ranked by semantic similarity."
                  : "All of your notes in one clean, distraction-free list."}
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <NoteList
            emptyDescription={
              isSearchVisible
                ? "Try a different idea or phrase. Semantic search works best once a few notes have embeddings stored."
                : "Start with a single idea. Your notes will appear here as you add them."
            }
            emptyTitle={isSearchVisible ? "No related notes found" : "No notes yet"}
            highlightQuery={isSearchVisible ? searchQuery : ""}
            notes={displayedNotes}
            isLoading={isLoading}
          />
        </section>
      </div>

      <SubscriptionPrompt
        isOpen={showSubscription}
        onClose={() => setShowSubscription(false)}
        title="You're out of AI credits"
      />
    </main>
  );
}

function readNotesCache(cacheKey: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(cacheKey);

    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as CachedNotesPayload;
    return parsed.notes ?? [];
  } catch {
    return [];
  }
}

function writeNotesCache(cacheKey: string, notes: Note[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: CachedNotesPayload = {
    notes,
    savedAt: Date.now()
  };

  window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
}
