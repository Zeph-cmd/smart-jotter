import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcription";
import {
  enforceAudioQuota,
  incrementAudioUsage,
  MAX_RECORDING_SECONDS
} from "@/lib/ai/audio-usage";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024;

type TranscribeRequestBody = {
  durationSeconds?: number;
};

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

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

    // Enforce the monthly 4-hour quota before spending the Deepgram call.
    await enforceAudioQuota(supabase, userId, durationSeconds);

    const text = await transcribeAudio(candidate);

    if (!text) {
      return NextResponse.json(
        { error: "Could not detect speech. Try clearer audio." },
        { status: 422 }
      );
    }

    // Record usage only after a successful transcription.
    await incrementAudioUsage(supabase, userId, durationSeconds);

    return NextResponse.json({ text });
  } catch (error) {
    return handleRouteError(
      "api-ai-transcribe-post",
      error,
      "Could not transcribe audio right now."
    );
  }
}