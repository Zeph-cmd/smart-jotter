"use client";

import { useMemo, useState } from "react";
import type { QuizQuestion } from "@/types/note";

type QuizModeProps = {
  isLoading: boolean;
  onStart: () => void;
  questions: QuizQuestion[];
};

export function QuizMode({ isLoading, onStart, questions }: QuizModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIndex] ?? null;
  const normalizedTypedAnswer = typedAnswer.trim().toLowerCase();

  const isTypedAnswerCorrect = useMemo(() => {
    if (!currentQuestion) {
      return false;
    }

    return normalizedTypedAnswer === currentQuestion.answer.trim().toLowerCase();
  }, [currentQuestion, normalizedTypedAnswer]);

  if (questions.length === 0) {
    return (
      <section className="rounded-[28px] border border-line bg-white p-5 shadow-jotter dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Quiz mode
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">Test yourself</h2>
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {isLoading ? "Building..." : "Start quiz"}
          </button>
        </div>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Build a short quiz from your note flashcards when you&apos;re ready.
        </p>
      </section>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const isMultipleChoiceCorrect = selectedAnswer === currentQuestion.answer;

  const handleCheck = () => {
    const isCorrect =
      currentQuestion.type === "multiple_choice"
        ? isMultipleChoiceCorrect
        : isTypedAnswerCorrect;

    if (isCorrect) {
      setScore((currentScore) => currentScore + 1);
    }

    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex >= questions.length - 1) {
      setCurrentIndex(0);
      setScore(0);
      setSelectedAnswer(null);
      setTypedAnswer("");
      setShowResult(false);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setSelectedAnswer(null);
    setTypedAnswer("");
    setShowResult(false);
  };

  return (
    <section className="rounded-[28px] border border-line bg-white p-5 shadow-jotter dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Quiz mode
          </p>
          <h2 className="mt-2 text-xl font-semibold text-ink dark:text-slate-100">
            Question {currentIndex + 1} of {questions.length}
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
          Score {score}/{questions.length}
        </span>
      </div>

      <p className="mt-5 text-base leading-7 text-ink dark:text-slate-100">{currentQuestion.question}</p>

      <div className="mt-5">
        {currentQuestion.type === "multiple_choice" ? (
          <div className="grid gap-3">
            {(currentQuestion.options ?? []).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedAnswer(option)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  selectedAnswer === option
                    ? "border-accent bg-blue-50 text-accent dark:bg-blue-500/20"
                    : "border-line bg-slate-50 text-slate-700 hover:bg-white dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <input
            value={typedAnswer}
            onChange={(event) => setTypedAnswer(event.target.value)}
            placeholder="Type your answer"
            className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
          />
        )}
      </div>

      <div className="mt-5 flex items-center gap-3">
        {!showResult ? (
          <button
            type="button"
            onClick={handleCheck}
            disabled={
              currentQuestion.type === "multiple_choice"
                ? !selectedAnswer
                : !typedAnswer.trim()
            }
            className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-blue-500"
          >
            Check answer
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center justify-center rounded-full bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {currentIndex >= questions.length - 1 ? "Restart quiz" : "Next question"}
          </button>
        )}
      </div>

      {showResult ? (
        <div className="mt-5 rounded-2xl border border-line bg-slate-50 px-4 py-4 dark:bg-slate-950">
          <p className="text-sm font-medium text-ink dark:text-slate-100">
            {currentQuestion.type === "multiple_choice"
              ? isMultipleChoiceCorrect
                ? "Correct"
                : "Not quite"
              : isTypedAnswerCorrect
                ? "Correct"
                : "Not quite"}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Correct answer: {currentQuestion.answer}
          </p>
        </div>
      ) : null}
    </section>
  );
}
