import type { Flashcard, ReviewPerformance } from "@/types/note";

type FlashcardReviewProps = {
  currentIndex: number;
  flashcard: Flashcard | null;
  isSubmitting: boolean;
  onPerformance: (performance: ReviewPerformance) => void;
  onToggleAnswer: () => void;
  revealed: boolean;
  total: number;
};

export function FlashcardReview({
  currentIndex,
  flashcard,
  isSubmitting,
  onPerformance,
  onToggleAnswer,
  revealed,
  total
}: FlashcardReviewProps) {
  if (!flashcard) {
    return (
      <section className="rounded-[28px] border border-dashed border-line bg-slate-50 px-5 py-8 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Generate flashcards to start reviewing this note.
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-line bg-white p-5 shadow-jotter dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Flashcard {currentIndex + 1} of {total}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">Review</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          {flashcard.difficulty}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleAnswer}
        className="mt-5 w-full rounded-[28px] border border-line bg-slate-50 px-5 py-8 text-left transition hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900"
      >
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
          Question
        </p>
        <p className="mt-3 text-base leading-7 text-ink dark:text-slate-100">{flashcard.question}</p>

        <div className="mt-6 border-t border-line pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {revealed ? "Answer" : "Tap to reveal answer"}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {revealed ? flashcard.answer : "Keep the answer hidden until you're ready."}
          </p>
        </div>
      </button>

      {revealed ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <ReviewButton
            disabled={isSubmitting}
            label="Again"
            onClick={() => onPerformance("again")}
          />
          <ReviewButton
            disabled={isSubmitting}
            label="Good"
            onClick={() => onPerformance("good")}
          />
          <ReviewButton
            disabled={isSubmitting}
            label="Easy"
            onClick={() => onPerformance("easy")}
          />
        </div>
      ) : null}
    </section>
  );
}

type ReviewButtonProps = {
  disabled: boolean;
  label: string;
  onClick: () => void;
};

function ReviewButton({ disabled, label, onClick }: ReviewButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {label}
    </button>
  );
}
