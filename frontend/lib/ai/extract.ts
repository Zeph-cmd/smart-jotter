import { extractText, getDocumentProxy } from "unpdf";
import { openAIRequest } from "./openai";

/**
 * Text extraction for the import feature: images via a bounded vision call,
 * text-based PDFs via pure code (no AI cost). The API route owns auth,
 * validation, credits, and rate limiting — these helpers only transform bytes
 * into text.
 */

// GPT-6 Luna with reasoning_effort "none" — same profile as the other writing
// features (see lib/ai/suggestions.ts). Vision input uses the standard
// image_url content part.
const EXTRACT_MODEL = "gpt-6-luna";
const REASONING_EFFORT = "none";

/**
 * Hard output ceiling for image extraction (~1,500 words). Bounds the per-call
 * API cost no matter how dense the screenshot is. gpt-6 models use
 * `max_completion_tokens`, not the legacy `max_tokens`.
 */
const EXTRACT_MAX_COMPLETION_TOKENS = 2000;

type ChatCompletionsResponse = {
  choices: Array<{
    message: {
      content: string | null;
    };
    finish_reason: string;
  }>;
};

/**
 * Extracts all visible text from an image (typed or handwritten) using the
 * vision model. Returns only the extracted text.
 */
export async function extractTextFromImage(dataUrl: string): Promise<string> {
  const response = await openAIRequest<ChatCompletionsResponse>(
    "/chat/completions",
    {
      model: EXTRACT_MODEL,
      reasoning_effort: REASONING_EFFORT,
      temperature: 0,
      max_completion_tokens: EXTRACT_MAX_COMPLETION_TOKENS,
      messages: [
        {
          role: "developer",
          content:
            "You extract text from images for a note-taking app. Transcribe ALL text exactly as it appears, preserving line breaks, lists, and structure. If the text is handwritten, transcribe it as accurately as possible. Return only the extracted text — no commentary, no markdown fences."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this image."
            },
            {
              type: "image_url",
              image_url: { url: dataUrl }
            }
          ]
        }
      ]
    }
  );

  return response.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Extracts text from a PDF using pure code (pdf.js via unpdf) — no AI call,
 * no API cost. Returns the merged text and the page count. Callers must check
 * for an empty text result (scanned PDFs have no text layer).
 */
export async function extractTextFromPdf(
  buffer: ArrayBuffer
): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });

  return {
    text: (Array.isArray(text) ? text.join("\n\n") : text).trim(),
    pages: totalPages
  };
}
