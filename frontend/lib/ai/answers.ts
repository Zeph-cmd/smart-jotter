import type { SupabaseClient } from "@supabase/supabase-js";
import { openAIRequest } from "@/lib/ai/openai";
import { semanticSearch } from "@/lib/search/semantic-search";
import type { Note } from "@/types/note";

const ANSWER_MODEL = "gpt-4.1-mini";

type ChatCompletionsResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

type AskNotesResult = {
  answer: string;
  notes: Note[];
};

export async function askYourNotes(
  supabase: SupabaseClient,
  userId: string,
  question: string
): Promise<AskNotesResult> {
  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new Error("Question is required.");
  }

  const relevantNotes = await semanticSearch(supabase, userId, normalizedQuestion, 4);

  if (relevantNotes.length === 0) {
    return {
      answer: "I could not find any relevant saved notes for that question yet.",
      notes: []
    };
  }

  const response = await openAIRequest<ChatCompletionsResponse>("/chat/completions", {
    model: ANSWER_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "developer",
        content:
          "You answer questions using only the user's notes. If the notes do not contain the answer, say that briefly. Keep answers concise and grounded in the provided notes."
      },
      {
        role: "user",
        content: buildAskPrompt(normalizedQuestion, relevantNotes)
      }
    ]
  });

  const answer = response.choices[0]?.message.content?.trim();

  if (!answer) {
    throw new Error("OpenAI returned an empty answer.");
  }

  return {
    answer,
    notes: relevantNotes
  };
}

function buildAskPrompt(question: string, notes: Note[]) {
  const noteContext = notes
    .map(
      (note, index) =>
        `Note ${index + 1}\nTitle: ${note.title}\nCreated at: ${note.created_at}\nContent:\n${truncateContent(note.content)}`
    )
    .join("\n\n---\n\n");

  return `Answer the question using only the notes below.\n\nQuestion: ${question}\n\nNotes:\n${noteContext}`;
}

function truncateContent(content: string) {
  const trimmedContent = content.trim();

  if (trimmedContent.length <= 2500) {
    return trimmedContent || "(empty note)";
  }

  return `${trimmedContent.slice(0, 2500)}...`;
}
