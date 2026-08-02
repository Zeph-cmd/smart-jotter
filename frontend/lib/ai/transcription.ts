import { getDeepgramKey } from "@/lib/env";

type DeepgramResponse = {
  results?: {
    channels?: Array<{
      alternatives?: Array<{
        transcript?: string;
      }>;
    }>;
  };
};

type DeepgramErrorResponse = {
  err_code?: string;
  err_msg?: string;
};

const DEEPGRAM_TRANSCRIPTION_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true";

export async function transcribeAudio(file: File) {
  const apiKey = getDeepgramKey();

  if (!apiKey) {
    throw new Error(
      "Missing DEEPGRAM_API_KEY. Speech-to-text needs it."
    );
  }

  const response = await fetch(DEEPGRAM_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": file.type || "audio/webm"
    },
    body: file
  });

  const payload = (await response.json()) as DeepgramResponse &
    DeepgramErrorResponse;

  if (!response.ok) {
    throw new Error(
      payload.err_msg ?? "Deepgram transcription failed."
    );
  }

  return payload.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
}