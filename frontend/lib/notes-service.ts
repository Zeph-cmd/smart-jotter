import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { syncRelatedNotes } from "@/lib/graph/related-notes";
import { cosineSimilarity } from "@/lib/search/cosine-similarity";
import { parseStoredEmbedding, toPgVector } from "@/lib/search/vector";
import type { Note, NoteWithEmbedding } from "@/types/note";

type NoteInput = {
  content: string;
  title: string;
};

type MatchNotesRow = Note & {
  similarity: number;
};

type ScoredNote = Note & {
  similarity: number;
};

export async function getNotes(
  supabase: SupabaseClient,
  userId: string
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("sj_notes")
    .select("id, title, content, created_at, related_notes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getNoteById(
  supabase: SupabaseClient,
  userId: string,
  id: string
): Promise<Note | null> {
  const { data, error } = await supabase
    .from("sj_notes")
    .select("id, title, content, created_at, related_notes")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: NoteInput
): Promise<Note> {
  const embedding = await generateNoteEmbedding(input);
  const insertPayload = {
    user_id: userId,
    title: input.title,
    content: input.content,
    embedding: embedding ? toPgVector(embedding) : null,
    related_notes: []
  };

  const { data, error } = await supabase
    .from("sj_notes")
    .insert(insertPayload)
    .select("id, title, content, created_at, related_notes")
    .single();

  if (error) {
    throw error;
  }

  if (embedding) {
    try {
      await syncRelatedNotes(supabase, userId, data.id, embedding);
    } catch {
      // Relation sync is best-effort so note creation stays resilient.
    }
  }

  return data;
}

export async function updateNote(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: NoteInput
): Promise<Note> {
  const embedding = await generateNoteEmbedding(input);
  const updatePayload = {
    title: input.title,
    content: input.content,
    embedding: embedding ? toPgVector(embedding) : null,
    related_notes: []
  };

  const { data, error } = await supabase
    .from("sj_notes")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("id", id)
    .select("id, title, content, created_at, related_notes")
    .single();

  if (error) {
    throw error;
  }

  if (embedding) {
    try {
      await syncRelatedNotes(supabase, userId, id, embedding);
    } catch {
      // Relation sync is best-effort so note updates never block the save.
    }
  }

  return data;
}

export async function searchNotesByVector(
  supabase: SupabaseClient,
  userId: string,
  queryEmbedding: number[],
  limit = 6
): Promise<Note[]> {
  const { data, error } = await supabase.rpc("match_sj_notes", {
    query_user_id: userId,
    query_embedding: toPgVector(queryEmbedding),
    match_count: limit
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MatchNotesRow[]).map((note) => ({
    id: note.id,
    title: note.title,
    content: note.content,
    created_at: note.created_at,
    similarity: note.similarity
  }));
}

export async function searchNotesManually(
  supabase: SupabaseClient,
  userId: string,
  queryEmbedding: number[],
  limit = 6
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("sj_notes")
    .select("id, title, content, created_at, related_notes, embedding")
    .eq("user_id", userId)
    .not("embedding", "is", null);

  if (error) {
    throw error;
  }

  const scoredNotes = ((data ?? []) as NoteWithEmbedding[])
    .map((note): ScoredNote | null => {
      const embedding = parseStoredEmbedding(note.embedding);

      if (!embedding) {
        return null;
      }

      return {
        id: note.id,
        title: note.title,
        content: note.content,
        created_at: note.created_at,
        related_notes: note.related_notes,
        similarity: cosineSimilarity(queryEmbedding, embedding)
      };
    })
    .filter((note): note is ScoredNote => note !== null);

  return scoredNotes
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit);
}

function buildNoteEmbeddingText(input: NoteInput) {
  return [input.title.trim(), input.content.trim()].filter(Boolean).join("\n\n");
}

async function generateNoteEmbedding(input: NoteInput) {
  const embeddingText = buildNoteEmbeddingText(input);

  try {
    return await generateEmbedding(embeddingText);
  } catch {
    return null;
  }
}
