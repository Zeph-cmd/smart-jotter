"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderStatus =
  | "idle"
  | "recording"
  | "stopping"
  | "transcribing";

/** Hard cap on a single continuous recording: 30 minutes. */
export const MAX_RECORDING_SECONDS = 30 * 60;

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (
    type: "release",
    listener: () => void
  ) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

type UseVoiceRecorderResult = {
  status: VoiceRecorderStatus;
  error: string | null;
  elapsedSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ blob: Blob | null; durationSeconds: number }>;
  reset: () => void;
};

/**
 * Encapsulates microphone access + MediaRecorder lifecycle so components can
 * focus on UX (start/end) instead of juggling stream cleanup.
 *
 * Enforces a 30-minute maximum per recording: when the cap is reached the
 * recorder auto-stops and resolves stopRecording() with the captured blob,
 * exactly as if the user had clicked "End recording".
 */
export function useVoiceRecorder(): UseVoiceRecorderResult {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopResolverRef = useRef<
    | ((result: { blob: Blob | null; durationSeconds: number }) => void)
    | null
  >(null);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopTriggeredRef = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cleanupStream = useCallback(() => {
    clearTimer();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, [clearTimer]);

  const releaseWakeLock = useCallback(async () => {
    const currentWakeLock = wakeLockRef.current;

    if (!currentWakeLock) {
      return;
    }

    try {
      await currentWakeLock.release();
    } catch {
      // Some browsers auto-release and throw if release() is called again.
    } finally {
      wakeLockRef.current = null;
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const navigatorWithWakeLock = navigator as NavigatorWithWakeLock;

    if (!navigatorWithWakeLock.wakeLock?.request) {
      return;
    }

    try {
      const sentinel = await navigatorWithWakeLock.wakeLock.request("screen");
      wakeLockRef.current = sentinel;
      sentinel.addEventListener?.("release", () => {
        wakeLockRef.current = null;
      });
    } catch {
      // Wake Lock can fail on unsupported devices, low battery, or policy.
      // Recording still continues as best effort without it.
      wakeLockRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setElapsedSeconds(0);
    chunksRef.current = [];
    recorderRef.current = null;
    stopResolverRef.current = null;
    autoStopTriggeredRef.current = false;
    void releaseWakeLock();
  }, [releaseWakeLock]);

  const finalizeRecording = useCallback(() => {
    cleanupStream();
    void releaseWakeLock();

    const durationSeconds = Math.round(
      (Date.now() - startTimeRef.current) / 1000
    );

    if (chunksRef.current.length === 0) {
      setError("No audio captured. Try again.");
      setStatus("idle");
      setElapsedSeconds(0);
      stopResolverRef.current?.({ blob: null, durationSeconds });
      stopResolverRef.current = null;
      return;
    }

    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    setStatus("idle");
    setElapsedSeconds(0);
    stopResolverRef.current?.({ blob, durationSeconds });
    stopResolverRef.current = null;
  }, [cleanupStream, releaseWakeLock]);

  const startRecording = useCallback(async () => {
    setError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      autoStopTriggeredRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      const [audioTrack] = stream.getAudioTracks();
      if (audioTrack) {
        audioTrack.onended = () => {
          setError(
            "Recording was interrupted by your device or browser. Keep Smart Jotter active and try again."
          );
          const current = recorderRef.current;

          if (current && current.state !== "inactive") {
            current.stop();
          }
        };
      }

      recorder.onstop = () => {
        finalizeRecording();
      };

      recorder.start();
      await requestWakeLock();
      setStatus("recording");
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);

      // Tick every second for the UI + auto-stop enforcement.
      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );
        setElapsedSeconds(elapsed);

        if (
          elapsed >= MAX_RECORDING_SECONDS &&
          !autoStopTriggeredRef.current
        ) {
          autoStopTriggeredRef.current = true;
          const current = recorderRef.current;
          if (current && current.state !== "inactive") {
            setStatus("stopping");
            current.stop();
          }
        }
      }, 1000);
    } catch {
      cleanupStream();
      void releaseWakeLock();
      setError("Microphone access was denied.");
      setStatus("idle");
    }
  }, [cleanupStream, finalizeRecording, releaseWakeLock, requestWakeLock]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;

    if (!recorder || recorder.state === "inactive") {
      cleanupStream();
      void releaseWakeLock();
      setStatus("idle");
      const durationSeconds = Math.round(
        (Date.now() - startTimeRef.current) / 1000
      );
      return { blob: null, durationSeconds };
    }

    setStatus("stopping");

    return new Promise<{ blob: Blob | null; durationSeconds: number }>(
      (resolve) => {
        stopResolverRef.current = resolve;
        recorder.stop();
      }
    );
  }, [cleanupStream, releaseWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      if (status !== "recording" && status !== "stopping") {
        return;
      }

      if (wakeLockRef.current) {
        return;
      }

      void requestWakeLock();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [requestWakeLock, status]);

  useEffect(() => {
    return () => {
      cleanupStream();
      void releaseWakeLock();
      const recorder = recorderRef.current;

      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };
  }, [cleanupStream, releaseWakeLock]);

  return {
    status,
    error,
    elapsedSeconds,
    startRecording,
    stopRecording,
    reset
  };
}