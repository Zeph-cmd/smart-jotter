"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SubscriptionPrompt } from "@/components/ui/subscription-prompt";
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder";

type QuotaSummary = {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
};

type SpeechToTextButtonProps = {
  onTranscribe: (audio: Blob, durationSeconds: number) => Promise<string>;
  onTranscribed: (text: string) => void;
  label?: string;
  disabled?: boolean;
  /** Optional className override for the trigger button. */
  className?: string;
};

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatQuota(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

/**
 * Speech-to-text trigger that presents the user with explicit recording
 * options (start / end) before doing anything. Clicking the trigger opens a
 * small menu; the menu drives the recorder lifecycle and transcription.
 *
 * Flow:
 *   idle        -> click trigger -> menu shows "Start recording"
 *   recording   -> menu shows "End recording" -> transcribes -> saves
 *   transcribing -> menu disabled with "Transcribing..."
 *
 * Enforces a 30-minute max per recording (auto-stops) and a 4-hour monthly
 * quota (fetched from /api/ai/transcribe-quota).
 */
export function SpeechToTextButton({
  onTranscribe,
  onTranscribed,
  label = "Speech to text",
  disabled = false,
  className
}: SpeechToTextButtonProps) {
  const {
    status,
    error,
    elapsedSeconds,
    startRecording,
    stopRecording,
    reset
  } = useVoiceRecorder();
  const [isOpen, setIsOpen] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(
    null
  );
  const [quota, setQuota] = useState<QuotaSummary | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const refreshQuota = useCallback(async () => {
    try {
      const response = await fetch("/api/ai/transcribe-quota", {
        cache: "no-store"
      });

      if (response.ok) {
        const data = (await response.json()) as QuotaSummary;
        setQuota(data);
      }
    } catch {
      // Non-blocking: quota display is best-effort.
    }
  }, []);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  useEffect(() => {
    if (error) {
      setTranscriptionError(error);
    }
  }, [error]);

  // Close the menu when clicking outside.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const isRecording = status === "recording";
  const isStopping = status === "stopping";
  const isBusy = isStopping || isTranscribing;
  const quotaExhausted =
    quota !== null && quota.remainingSeconds <= 0;

  const handleTriggerClick = () => {
    if (disabled || isBusy) {
      return;
    }

    // If quota is exhausted, open the subscription prompt instead of recording.
    if (quotaExhausted) {
      setShowSubscription(true);
      return;
    }

    setTranscriptionError(null);
    setIsOpen((previous) => !previous);
  };

  const handleStartRecording = async () => {
    setTranscriptionError(null);
    setIsOpen(false);
    await startRecording();
  };

  const handleEndRecording = async () => {
    setTranscriptionError(null);
    setIsOpen(false);

    const result = await stopRecording();

    if (!result.blob) {
      return;
    }

    const { blob, durationSeconds } = result;

    reset();
    setIsTranscribing(true);

    try {
      const text = await onTranscribe(blob, durationSeconds);

      if (text.trim()) {
        onTranscribed(text);
      }

      // Refresh quota after a successful transcription.
      void refreshQuota();
    } catch (caughtError) {
      setTranscriptionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not transcribe audio."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const triggerLabel = isTranscribing
    ? "Transcribing..."
    : isRecording
      ? "Recording..."
      : label;

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled || isBusy}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={
          quotaExhausted
            ? "Recording limit reached — tap to upgrade"
            : undefined
        }
        className={
          className ??
          "inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-blue-500"
        }
      >
        {isRecording ? (
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            {triggerLabel} · {formatClock(elapsedSeconds)}
          </span>
        ) : (
          triggerLabel
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-jotter dark:bg-slate-900"
        >
          {!isRecording ? (
            <button
              key="start"
              type="button"
              role="menuitem"
              onClick={() => {
                void handleStartRecording();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Start recording
            </button>
          ) : (
            <button
              key="end"
              type="button"
              role="menuitem"
              onClick={() => {
                void handleEndRecording();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              End recording
            </button>
          )}
          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
            {isRecording
              ? "Click end recording to stop and transcribe."
              : "Recording uses your microphone. Max 30 min per clip."}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        {quota ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {quotaExhausted ? (
              <button
                type="button"
                onClick={() => setShowSubscription(true)}
                className="font-medium text-accent underline hover:text-blue-700 dark:text-blue-400"
              >
                Recording limit reached — tap to upgrade
              </button>
            ) : (
              `${formatQuota(quota.remainingSeconds)} of audio left.`
            )}
          </p>
        ) : null}

        {transcriptionError ? (
          <p className="text-xs text-red-600 dark:text-red-300">
            {transcriptionError}
          </p>
        ) : null}
      </div>

      <SubscriptionPrompt
        isOpen={showSubscription}
        onClose={() => setShowSubscription(false)}
      />
    </div>
  );
}
