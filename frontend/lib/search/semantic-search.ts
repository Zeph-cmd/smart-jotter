import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { searchNotesByVector, searchNotesManually } from "@/lib/notes-service";
import type { Note } from "@/types/note";

export async function semanticSearch(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 6
): Promise<Note[]> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  const queryEmbedding = await generateEmbedding(normalizedQuery);

  if (!queryEmbedding) {
    throw new Error(
      "Semantic search needs your OpenAI key and at least one saved note embedding."
    );
  }

  try {
    return await searchNotesByVector(supabase, userId, queryEmbedding, limit);
  } catch {
    return searchNotesManually(supabase, userId, queryEmbedding, limit);
  }
}
