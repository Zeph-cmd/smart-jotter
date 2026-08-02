import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { generateFlashcardsForNote } from "@/lib/learning/flashcards";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    note_id?: string;
  };
  const noteId = body.note_id?.trim();

  if (!noteId) {
    return NextResponse.json(
      { error: "note_id is required." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const flashcards = await generateFlashcardsForNote(
      supabase,
      requireUserId(user),
      noteId
    );
    return NextResponse.json({ flashcards });
  } catch (error) {
    return handleRouteError(
      "api-flashcards-generate-post",
      error,
      "Could not generate flashcards.",
      { noteId }
    );
  }
}
