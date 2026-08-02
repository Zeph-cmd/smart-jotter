import type { SupabaseClient } from "@supabase/supabase-js";
import { openAIRequest } from "@/lib/ai/openai";
import { getNoteById } from "@/lib/notes-service";
import type {
  Flashcard,
  FlashcardDifficulty,
  QuizQuestion,
  ReviewPerformance
} from "@/types/note";

const FLASHCARD_MODEL = "gpt-4.1-mini";

type ChatCompletionsResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

type GeneratedFlashcardDraft = {
  answer?: string;
  difficulty?: string;
  question?: string;
};

type NormalizedFlashcardDraft = {
  answer: string;
  difficulty: FlashcardDifficulty;
  question: string;
};

export async function getFlashcardsByNoteId(
  supabase: SupabaseClient,
  userId: string,
  noteId: string
): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from("sj_flashcards")
    .select("id, note_id, question, answer, difficulty, next_review, created_at")
    .eq("user_id", userId)
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function generateFlashcardsForNote(
  supabase: SupabaseClient,
  userId: string,
  noteId: string
): Promise<Flashcard[]> {
  const note = await getNoteById(supabase, userId, noteId);

  if (!note) {
    throw new Error("Note not found.");
  }

  if (!note.content.trim()) {
    throw new Error("This note needs some content before flashcards can be generated.");
  }

  const drafts = await requestFlashcardsFromAI(note.title, note.content);

  if (drafts.length === 0) {
    throw new Error("OpenAI did not return any flashcards.");
  }

  const { error: deleteError } = await supabase
    .from("sj_flashcards")
    .delete()
    .eq("user_id", userId)
    .eq("note_id", noteId);

  if (deleteError) {
    throw deleteError;
  }

  const insertPayload = drafts.map((draft) => ({
    user_id: userId,
    note_id: noteId,
    question: draft.question,
    answer: draft.answer,
    difficulty: draft.difficulty,
    next_review: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from("sj_flashcards")
    .insert(insertPayload)
    .select("id, note_id, question, answer, difficulty, next_review, created_at");

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDueFlashcards(
  supabase: SupabaseClient,
  userId: string
): Promise<Flashcard[]> {
  const { data, error } = await supabase
    .from("sj_flashcards")
    .select("id, note_id, question, answer, difficulty, next_review, created_at")
    .eq("user_id", userId)
    .lte("next_review", new Date().toISOString())
    .order("next_review", { ascending: true })
    .limit(20);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function reviewFlashcard(
  supabase: SupabaseClient,
  userId: string,
  input: {
    flashcardId: string;
    performance: ReviewPerformance;
  }
): Promise<Flashcard> {
  const nextReview = calculateNextReview(input.performance);

  const { data, error } = await supabase
    .from("sj_flashcards")
    .update({ next_review: nextReview.toISOString() })
    .eq("user_id", userId)
    .eq("id", input.flashcardId)
    .select("id, note_id, question, answer, difficulty, next_review, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function buildQuizForNote(
  supabase: SupabaseClient,
  userId: string,
  noteId: string
): Promise<{
  noteTitle: string;
  questions: QuizQuestion[];
}> {
  const note = await getNoteById(supabase, userId, noteId);

  if (!note) {
    throw new Error("Note not found.");
  }

  const flashcards = await getFlashcardsByNoteId(supabase, userId, noteId);

  if (flashcards.length === 0) {
    return {
      noteTitle: note.title,
      questions: []
    };
  }

  const questions = flashcards.slice(0, 5).map((flashcard) => {
    const distractors = flashcards
      .filter((candidate) => candidate.id !== flashcard.id)
      .map((candidate) => candidate.answer)
      .filter(
        (answer) =>
          answer.trim().toLowerCase() !== flashcard.answer.trim().toLowerCase()
      )
      .slice(0, 3);

    if (distractors.length >= 3) {
      return {
        flashcard_id: flashcard.id,
        question: flashcard.question,
        answer: flashcard.answer,
        type: "multiple_choice" as const,
        options: shuffle([flashcard.answer, ...distractors]).slice(0, 4)
      };
    }

    return {
      flashcard_id: flashcard.id,
      question: flashcard.question,
      answer: flashcard.answer,
      type: "short_answer" as const
    };
  });

  return {
    noteTitle: note.title,
    questions
  };
}

function calculateNextReview(performance: ReviewPerformance) {
  const nextReview = new Date();

  if (performance === "again") {
    nextReview.setMinutes(nextReview.getMinutes() + 15);
    return nextReview;
  }

  if (performance === "good") {
    nextReview.setDate(nextReview.getDate() + 3);
    return nextReview;
  }

  nextReview.setDate(nextReview.getDate() + 7);
  return nextReview;
}

async function requestFlashcardsFromAI(title: string, content: string) {
  const response = await openAIRequest<ChatCompletionsResponse>("/chat/completions", {
    model: FLASHCARD_MODEL,
    temperature: 0.3,
    messages: [
      {
        role: "developer",
        content:
          "Turn notes into concise study flashcards. Return only a JSON array with 3 to 5 objects using question, answer, and difficulty fields. Difficulty must be easy, medium, or hard."
      },
      {
        role: "user",
        content: `Title: ${title}\n\nNote:\n${content}`
      }
    ]
  });

  const rawContent = response.choices[0]?.message.content?.trim();

  if (!rawContent) {
    return [];
  }

  const parsed = parseFlashcardJson(rawContent);

  return parsed
    .map(normalizeFlashcardDraft)
    .filter((draft): draft is NormalizedFlashcardDraft => draft !== null)
    .slice(0, 5);
}

function parseFlashcardJson(rawContent: string): GeneratedFlashcardDraft[] {
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

  return parsed as GeneratedFlashcardDraft[];
}

function normalizeFlashcardDraft(draft: GeneratedFlashcardDraft) {
  const question = draft.question?.trim();
  const answer = draft.answer?.trim();
  const difficulty = normalizeDifficulty(draft.difficulty);

  if (!question || !answer) {
    return null;
  }

  return {
    question,
    answer,
    difficulty
  };
}

function normalizeDifficulty(value?: string): FlashcardDifficulty {
  if (value === "easy" || value === "medium" || value === "hard") {
    return value;
  }

  return "medium";
}

function shuffle<TValue>(values: TValue[]) {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentValue = copy[index];
    copy[index] = copy[randomIndex];
    copy[randomIndex] = currentValue;
  }

  return copy;
}
