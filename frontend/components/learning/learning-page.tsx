"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { FlashcardReview } from "@/components/learning/flashcard-review";
import { QuizMode } from "@/components/learning/quiz-mode";
import { useAuth } from "@/lib/auth/auth-context";
import {
  fetchDueReviewsRequest,
  fetchFlashcardsRequest,
  fetchNoteRequest,
  fetchQuizRequest,
  generateFlashcardsRequest,
  reviewFlashcardRequest
} from "@/lib/notes-api";
import type { Flashcard, Note, QuizQuestion, ReviewPerformance } from "@/types/note";

type LearningPageProps = {
  noteId: string;
};

export function LearningPage({ noteId }: LearningPageProps) {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [note, setNote] = useState<Note | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    if (isAuthLoading || !user) {
      return;
    }

    const loadLearningMode = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [currentNote, currentFlashcards, dueReviews] = await Promise.all([
          fetchNoteRequest(noteId),
          fetchFlashcardsRequest(noteId),
          fetchDueReviewsRequest()
        ]);

        setNote(currentNote);
        setFlashcards(currentFlashcards);
        setDueCount(dueReviews.dueCount);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load Learning Mode."
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadLearningMode();
  }, [isAuthLoading, noteId, user]);

  const currentFlashcard = flashcards[currentCardIndex] ?? null;
  const dueForThisNote = useMemo(
    () =>
      flashcards.filter(
        (flashcard) => new Date(flashcard.next_review).getTime() <= Date.now()
      ).length,
    [flashcards]
  );

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const cards = await generateFlashcardsRequest(noteId);
      setFlashcards(cards);
      setCurrentCardIndex(0);
      setRevealed(false);
      setQuizQuestions([]);
      const dueReviews = await fetchDueReviewsRequest();
      setDueCount(dueReviews.dueCount);
    } catch (caughtError) {
      setGenerationError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not generate flashcards."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (performance: ReviewPerformance) => {
    if (!currentFlashcard) {
      return;
    }

    setIsReviewSubmitting(true);
    setReviewError(null);

    try {
      const updatedFlashcard = await reviewFlashcardRequest({
        flashcard_id: currentFlashcard.id,
        performance
      });

      setFlashcards((currentCards) =>
        currentCards.map((card) =>
          card.id === updatedFlashcard.id ? updatedFlashcard : card
        )
      );
      setRevealed(false);
      setCurrentCardIndex((index) =>
        flashcards.length <= 1 ? 0 : (index + 1) % flashcards.length
      );
      const dueReviews = await fetchDueReviewsRequest();
      setDueCount(dueReviews.dueCount);
    } catch (caughtError) {
      setReviewError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update flashcard review."
      );
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleStartQuiz = async () => {
    setIsQuizLoading(true);
    setQuizError(null);

    try {
      const quiz = await fetchQuizRequest(noteId);
      setQuizQuestions(quiz.questions);
    } catch (caughtError) {
      setQuizError(
        caughtError instanceof Error ? caughtError.message : "Could not start quiz."
      );
    } finally {
      setIsQuizLoading(false);
    }
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

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl rounded-[32px] border border-line bg-white p-8 shadow-jotter dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading Learning Mode...</p>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href={`/notes/${noteId}`}
                className="inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Back to note
              </Link>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Learning Mode
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink dark:text-slate-100">
                {note.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Turn this note into flashcards, quiz yourself, and review what is due.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {isGenerating ? "Generating..." : "Generate Flashcards"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Flashcards"
              value={String(flashcards.length)}
              caption="Generated from this note"
            />
            <SummaryCard
              label="Due for this note"
              value={String(dueForThisNote)}
              caption="Ready to review now"
            />
            <SummaryCard
              label="Today"
              value={String(dueCount)}
              caption="Total cards due across Smart Jotter"
            />
          </div>

          {generationError ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
              {generationError}
            </div>
            ) : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-5">
            <FlashcardReview
              currentIndex={currentCardIndex}
              flashcard={currentFlashcard}
              isSubmitting={isReviewSubmitting}
              onPerformance={handleReview}
              onToggleAnswer={() => setRevealed((value) => !value)}
              revealed={revealed}
              total={flashcards.length}
            />

            {reviewError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {reviewError}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-5">
            <QuizMode
              isLoading={isQuizLoading}
              onStart={handleStartQuiz}
              questions={quizQuestions}
            />

            {quizError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                {quizError}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

type SummaryCardProps = {
  caption: string;
  label: string;
  value: string;
};

function SummaryCard({ caption, label, value }: SummaryCardProps) {
  return (
    <div className="rounded-[24px] border border-line bg-slate-50 px-4 py-4 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-ink dark:text-slate-100">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{caption}</p>
    </div>
  );
}
