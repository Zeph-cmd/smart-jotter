import { openAIRequest } from "@/lib/ai/openai";
import type { SuggestionAction } from "@/types/note";

const SUGGESTION_MODEL = "gpt-4o-mini";

type ChatCompletionsResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

const ACTION_INSTRUCTIONS: Record<SuggestionAction, string> = {
  simplify:
    "Simplify the note so it becomes clearer and easier to scan. Return only the revised note text.",
  explain:
    "Explain the note in plainer language while preserving the important ideas. Return only the explanation text.",
  improve:
    "Improve the note with better structure, clarity, and specificity. Return only the revised note text."
};

export async function generateSuggestion(input: {
  action: SuggestionAction;
  content: string;
}) {
  const content = input.content.trim();

  if (!content) {
    throw new Error("Note content is required.");
  }

  const response = await openAIRequest<ChatCompletionsResponse>(
    "/chat/completions",
    {
      model: SUGGESTION_MODEL,
      temperature: 0.4,
      messages: [
        {
          role: "developer",
          content:
            "You are a concise writing assistant for personal notes. Keep output focused, practical, and brief."
        },
        {
          role: "user",
          content: `${ACTION_INSTRUCTIONS[input.action]}\n\nNote:\n${content}`
        }
      ]
    }
  );

  const suggestion = response.choices[0]?.message.content?.trim();

  if (!suggestion) {
    throw new Error("OpenAI returned an empty suggestion.");
  }

  return suggestion;
}
