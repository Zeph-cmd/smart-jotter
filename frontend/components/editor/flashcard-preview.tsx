"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FlashcardPair } from "@/types/note";

type FlashcardPreviewProps = {
  flashcards: FlashcardPair[];
  isLoading?: boolean;
  error?: string | null;
  onDismiss?: () => void;
  onRegenerate?: () => void;
};

/**
 * Renders AI-generated flashcards as a flippable deck below the note editor.
 * Front shows the question; click/tap flips to reveal the answer. Includes
 * prev/next navigation and keyboard shortcuts (←/→, Space to flip, Esc to dismiss).
 */
export function FlashcardPreview({
  flashcards,
  isLoading = false,
  error = null,
  onDismiss,
  onRegenerate
}: FlashcardPreviewProps) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const total = flashcards.length;

  // Clamp the active index whenever the deck changes (e.g. regenerate).
  useEffect(() => {
    setIndex(0);
    setIsFlipped(false);
  }, [flashcards]);

  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;

  const next = useCallback(() => {
    setIsFlipped(false);
    setIndex((current) => (current + 1) % Math.max(total, 1));
  }, [total]);

  const prev = useCallback(() => {
    setIsFlipped(false);
    setIndex((current) =>
      current === 0 ? Math.max(total - 1, 0) : current - 1
    );
  }, [total]);

  const flip = useCallback(() => {
    setIsFlipped((current) => !current);
  }, []);

  // Keyboard shortcuts when the deck is visible & not loading.
  useEffect(() => {
    if (isLoading || total === 0) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      const isEditable =
        target?.isContentEditable || tag === "INPUT" || tag === "TEXTAREA";

      if (isEditable) {
        return;
      }

      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          next();
          break;
        case "ArrowLeft":
          event.preventDefault();
          prev();
          break;
        case " ":
        case "Enter":
          event.preventDefault();
          flip();
          break;
        case "Escape":
          onDismiss?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isLoading, total, next, prev, flip, onDismiss]);

  const progressLabel = useMemo(() => {
    if (total === 0) {
      return "";
    }
    return `Card ${safeIndex + 1} of ${total}`;
  }, [safeIndex, total]);

  if (isLoading) {
    return (
      <section
        aria-live="polite"
        className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm dark:bg-slate-900"
      >
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Generating flashcards…
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        aria-live="assertive"
        className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10"
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-500/20"
            >
              Dismiss
            </button>
          ) : null}
        </div>
        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="mt-3 rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-500/20"
          >
            Try again
          </button>
        ) : null}
      </section>
    );
  }

  if (total === 0) {
    return null;
  }

  const current = flashcards[safeIndex];

  return (
    <section
      aria-label="Flashcards"
      className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Flashcards
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {progressLabel} · tap the card to flip
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Regenerate
            </button>
          ) : null}
          {onDismiss ? (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss flashcards"
              className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <div className="[perspective:1200px]">
        <button
          type="button"
          onClick={flip}
          aria-label={
            isFlipped ? "Show question" : "Reveal answer"
          }
          className="relative block h-56 w-full cursor-pointer text-left [transform-style:preserve-3d] transition-transform duration-500 sm:h-48"
          style={{ transform: isFlipped ? "rotateY(180deg)" : undefined }}
        >
          {/* Front — Question */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-gradient-to-br from-blue-50 to-white p-6 text-center [backface-visibility:hidden] dark:from-blue-500/10 dark:to-slate-900">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">
              Question
            </span>
            <p className="text-base font-medium text-slate-900 dark:text-slate-100 sm:text-lg">
              {current.question}
            </p>
            <span className="absolute bottom-3 text-[11px] text-slate-400 dark:text-slate-500">
              Tap to reveal answer
            </span>
          </div>

          {/* Back — Answer */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-accent bg-gradient-to-br from-emerald-50 to-white p-6 text-center [backface-visibility:hidden] [transform:rotateY(180deg)] dark:from-emerald-500/10 dark:to-slate-900">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Answer
            </span>
            <p className="text-base text-slate-800 dark:text-slate-100 sm:text-lg">
              {current.answer}
            </p>
            <span className="absolute bottom-3 text-[11px] text-slate-400 dark:text-slate-500">
              Tap to show question
            </span>
          </div>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={total <= 1}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
        >
          ← Prev
        </button>

        <div className="flex items-center gap-1.5" aria-hidden="true">
          {flashcards.slice(0, 12).map((card, i) => (
            <span
              key={`${i}-${card.question.slice(0, 12)}`}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIndex
                  ? "w-5 bg-accent"
                  : "w-1.5 bg-slate-300 dark:bg-slate-700"
              }`}
            />
          ))}
          {total > 12 ? (
            <span className="ml-1 text-xs text-slate-400">+{total - 12}</span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={next}
          disabled={total <= 1}
          className="rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-600 transition enabled:hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:enabled:hover:bg-slate-800"
        >
          Next →
        </button>
      </div>
    </section>
  );
}