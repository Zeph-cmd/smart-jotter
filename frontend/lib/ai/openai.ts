import { getOpenAIKey } from "@/lib/env";
import { ApiError } from "@/lib/server/errors";
import { logServerError } from "@/lib/server/errors";

const OPENAI_API_URL = "https://api.openai.com/v1";
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

type OpenAIErrorPayload = {
  error?: {
    message?: string;
  };
};

type OpenAIRequestOptions = {
  retries?: number;
};

export function hasOpenAIKey() {
  return Boolean(getOpenAIKey());
}

export async function openAIRequest<TResponse>(
  path: string,
  body: Record<string, unknown>,
  options: OpenAIRequestOptions = {}
): Promise<TResponse> {
  const apiKey = getOpenAIKey();

  if (!apiKey) {
    throw new ApiError(
      "AI features are not configured yet. Add OPENAI_API_KEY in your environment.",
      503
    );
  }

  const retries = options.retries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(`${OPENAI_API_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const payload = (await response.json()) as TResponse & OpenAIErrorPayload;

    if (response.ok) {
      return payload;
    }

    const message = payload.error?.message ?? "OpenAI request failed.";
    const shouldRetry = RETRYABLE_STATUS_CODES.has(response.status) && attempt < retries;

    logServerError("openai-request", message, {
      attempt,
      path,
      status: response.status,
      willRetry: shouldRetry
    });

    if (!shouldRetry) {
      throw new ApiError(
        "AI is temporarily unavailable. Check your OpenAI key, quota, or billing, then try again.",
        response.status >= 400 && response.status < 500 ? 400 : 503
      );
    }

    await delay(400 * (attempt + 1));
  }

  throw new ApiError(
    "AI is temporarily unavailable. Check your OpenAI key, quota, or billing, then try again.",
    503
  );
}

function delay(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
