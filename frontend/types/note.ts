export type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  related_notes?: string[];
  similarity?: number;
};

export type StoredEmbedding = number[] | string | null;

export type NoteWithEmbedding = Note & {
  embedding: StoredEmbedding;
};

export type RelatedNote = {
  created_at: string;
  id: string;
  preview: string;
  title: string;
};

export type SuggestionAction = "expand" | "simplify" | "explain" | "improve";

export type FlashcardDifficulty = "easy" | "medium" | "hard";

export type ReviewPerformance = "again" | "good" | "easy";

export type Flashcard = {
  answer: string;
  created_at: string;
  difficulty: FlashcardDifficulty;
  id: string;
  next_review: string;
  note_id: string;
  question: string;
};

export type QuizQuestion = {
  answer: string;
  flashcard_id: string;
  options?: string[];
  question: string;
  type: "multiple_choice" | "short_answer";
};
