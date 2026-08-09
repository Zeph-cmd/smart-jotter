import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcription";
import {
  enforceAudioQuota,
  recordAudioUsage,
  MAX_RECORDING_SECONDS
} from "@/lib/ai/entitlements";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;
// Allow common web/container audio types only. Reject arbitrary file uploads.
const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/x-m4a",
  "audio/aac",
  "audio/flac",
  // Some browsers send a generic type for recorded webm blobs.
  "application/octet-stream",
  ""
]);

type TranscribeRequestBody = {
  durationSeconds?: number;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    // Rate limit per user — transcription is expensive (Deepgram).
    const { ok, retryAfter } = checkRateLimit(
      `transcribe:${userId}`,
      RATE_LIMITS.ai.limit,
      RATE_LIMITS.ai.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const formData = await request.formData();
    const candidate = formData.get("file");

    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
    }

    if (candidate.size === 0) {
      return NextResponse.json({ error: "Audio file is empty." }, { status: 400 });
    }

    if (candidate.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Audio file is too large. Max size is 25MB." },
        { status: 400 }
      );
    }

    // Reject unexpected MIME types to reduce attack surface. Deepgram will
    // also validate, but this stops obviously-wrong uploads early.
    const fileType = candidate.type ?? "";
    if (!ALLOWED_AUDIO_TYPES.has(fileType)) {
      return NextResponse.json(
        { error: "Unsupported audio format." },
        { status: 415 }
      );
    }

    // The client reports how long the recording was; cap it at 30 minutes as
    // a safety net (the recorder also auto-stops at 30 min).
    const body = Object.fromEntries(formData.entries()) as TranscribeRequestBody;
    const rawDuration = typeof body.durationSeconds === "string"
      ? Number(body.durationSeconds)
      : Number(body.durationSeconds ?? 0);
    const reportedDuration = Number.isFinite(rawDuration)
      ? Math.min(Math.max(0, Math.round(rawDuration)), MAX_RECORDING_SECONDS)
      : 0;

    // Fallback estimate from file size if the client didn't send a duration:
    // ~1.5 KB/s is a rough webm audio bitrate. Only used for accounting.
    const durationSeconds =
      reportedDuration > 0
        ? reportedDuration
        : Math.min(MAX_RECORDING_SECONDS, Math.round(candidate.size / 1536));

    // Enforce the quota (free-tier 90 min OR subscription allotment) before
    // spending the Deepgram call. Returns the active access/tier.
    const access = await enforceAudioQuota(supabase, userId, durationSeconds);

    const text = await transcribeAudio(candidate);

    if (!text) {
      return NextResponse.json(
        { error: "Could not detect speech. Try clearer audio." },
        { status: 422 }
      );
    }

    // Record usage against the correct tier after a successful transcription.
    await recordAudioUsage(supabase, userId, durationSeconds, access);

    return NextResponse.json({ text });
  } catch (error) {
    return handleRouteError(
      "api-ai-transcribe-post",
      error,
      "Could not transcribe audio right now."
    );
  }
}