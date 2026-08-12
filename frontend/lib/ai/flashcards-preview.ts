import { openAIRequest } from "@/lib/ai/openai";
import type { FlashcardPair } from "@/types/note";

const FLASHCARDS_MODEL = "gpt-4o-mini";

type ChatCompletionsResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

type RawFlashcardPair = {
  question?: string;
  answer?: string;
};

/**
 * Generates 5-8 concise question/answer flashcard pairs from note content.
 * Used by the note-editor "Flashcards" button (mirrors the Explain/Improve
 * pattern but parses a JSON array instead of returning a single string).
 */
export async function generateFlashcardsPreview(content: string): Promise<
  FlashcardPair[]
> {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new Error("Note content is required.");
  }

  const response = await openAIRequest<ChatCompletionsResponse>(
    "/chat/completions",
    {
      model: FLASHCARDS_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "developer",
          content:
            "You create study flashcards from notes. Generate 5 to 8 question/answer pairs that capture the key ideas. Return ONLY a JSON array of objects, each with a short 'question' and a concise 'answer'. Do not include any explanation, markdown, or surrounding text."
        },
        {
          role: "user",
          content: `Create 5-8 flashcards from this note:\n\n${trimmed}`
        }
      ]
    }
  );

  const rawContent = response.choices[0]?.message.content?.trim();

  if (!rawContent) {
    throw new Error("OpenAI returned an empty flashcards response.");
  }

  const parsed = parseFlashcardJson(rawContent);

  const pairs = parsed
    .map(normalizePair)
    .filter((pair): pair is FlashcardPair => pair !== null);

  if (pairs.length === 0) {
    throw new Error("OpenAI did not return any usable flashcards.");
  }

  return pairs.slice(0, 8);
}

function parseFlashcardJson(rawContent: string): RawFlashcardPair[] {
  const firstBracket = rawContent.indexOf("[");
  const lastBracket = rawContent.lastIndexOf("]");

  if (firstBracket === -1 || lastBracket === -1) {
    throw new Error("OpenAI returned flashcards in an unexpected format.");
  }

  const jsonText = rawContent.slice(firstBracket, lastBracket + 1);
  const parsed = JSON.parse(jsonText) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Flashcards response was not an array.");
  }

  return parsed as RawFlashcardPair[];
}

function normalizePair(raw: RawFlashcardPair): FlashcardPair | null {
  const question = raw.question?.trim();
  const answer = raw.answer?.trim();

  if (!question || !answer) {
    return null;
  }

  return { question, answer };
}