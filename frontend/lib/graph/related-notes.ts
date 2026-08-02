import type { SupabaseClient } from "@supabase/supabase-js";
import { cosineSimilarity } from "@/lib/search/cosine-similarity";
import { parseStoredEmbedding, toPgVector } from "@/lib/search/vector";
import type { NoteWithEmbedding, RelatedNote } from "@/types/note";

const DEFAULT_RELATED_LIMIT = 5;
const PREVIEW_LENGTH = 140;

type MatchNotesRow = {
  id: string;
  similarity: number;
};

export async function syncRelatedNotes(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  noteEmbedding: number[] | null,
  limit = DEFAULT_RELATED_LIMIT
) {
  if (!noteEmbedding) {
    const { error } = await supabase
      .from("sj_notes")
      .update({ related_notes: [] })
      .eq("user_id", userId)
      .eq("id", noteId);

    if (error) {
      throw error;
    }

    return [];
  }

  const relatedNoteIds = await findRelatedNoteIds(
    supabase,
    userId,
    noteId,
    noteEmbedding,
    limit
  );
  const { error } = await supabase
    .from("sj_notes")
    .update({ related_notes: relatedNoteIds })
    .eq("user_id", userId)
    .eq("id", noteId);

  if (error) {
    throw error;
  }

  return relatedNoteIds;
}

export async function getRelatedNotes(
  supabase: SupabaseClient,
  userId: string,
  noteId: string
): Promise<RelatedNote[]> {
  const { data: note, error: noteError } = await supabase
    .from("sj_notes")
    .select("related_notes")
    .eq("user_id", userId)
    .eq("id", noteId)
    .maybeSingle();

  if (noteError) {
    throw noteError;
  }

  const relatedNoteIds = ((note?.related_notes as string[] | undefined) ?? []).filter(
    Boolean
  );

  if (relatedNoteIds.length === 0) {
    return [];
  }

  const { data: relatedNotes, error: relatedError } = await supabase
    .from("sj_notes")
    .select("id, title, content, created_at")
    .eq("user_id", userId)
    .in("id", relatedNoteIds);

  if (relatedError) {
    throw relatedError;
  }

  const sortedNotes = (relatedNotes ?? []).sort(
    (left, right) =>
      relatedNoteIds.indexOf(left.id as string) - relatedNoteIds.indexOf(right.id as string)
  );

  return sortedNotes.map((note) => ({
    id: note.id as string,
    title: note.title as string,
    created_at: note.created_at as string,
    preview: createPreview(note.content as string)
  }));
}

async function findRelatedNoteIds(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  noteEmbedding: number[],
  limit: number
) {
  try {
    return await findRelatedNoteIdsWithVector(
      supabase,
      userId,
      noteId,
      noteEmbedding,
      limit
    );
  } catch {
    return findRelatedNoteIdsManually(supabase, userId, noteId, noteEmbedding, limit);
  }
}

async function findRelatedNoteIdsWithVector(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  noteEmbedding: number[],
  limit: number
) {
  const { data, error } = await supabase.rpc("match_sj_notes", {
    query_user_id: userId,
    query_embedding: toPgVector(noteEmbedding),
    match_count: limit + 1
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MatchNotesRow[])
    .filter((note) => note.id !== noteId)
    .slice(0, limit)
    .map((note) => note.id);
}

async function findRelatedNoteIdsManually(
  supabase: SupabaseClient,
  userId: string,
  noteId: string,
  noteEmbedding: number[],
  limit: number
) {
  const { data, error } = await supabase
    .from("sj_notes")
    .select("id, embedding")
    .eq("user_id", userId)
    .not("embedding", "is", null)
    .neq("id", noteId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Pick<NoteWithEmbedding, "embedding" | "id">>)
    .map((note) => {
      const embedding = parseStoredEmbedding(note.embedding);

      if (!embedding) {
        return null;
      }

      return {
        id: note.id,
        similarity: cosineSimilarity(noteEmbedding, embedding)
      };
    })
    .filter((note): note is MatchNotesRow => note !== null)
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit)
    .map((note) => note.id);
}

function createPreview(content: string) {
  const compactContent = content.replace(/\s+/g, " ").trim();

  if (!compactContent) {
    return "Empty note";
  }

  if (compactContent.length <= PREVIEW_LENGTH) {
    return compactContent;
  }

  return `${compactContent.slice(0, PREVIEW_LENGTH)}...`;
}
