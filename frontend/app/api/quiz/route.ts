import { NextResponse } from "next/server";
import {
  requireAuthenticatedClient,
  requireTermsAccepted,
  requireUserId
} from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { buildQuizForNote } from "@/lib/learning/flashcards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get("note_id")?.trim();

  if (!noteId) {
    return NextResponse.json(
      { error: "note_id is required." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);
    await requireTermsAccepted(supabase, userId);
    const quiz = await buildQuizForNote(supabase, userId, noteId);
    return NextResponse.json({
      note_title: quiz.noteTitle,
      questions: quiz.questions
    });
  } catch (error) {
    return handleRouteError("api-quiz-get", error, "Could not load that quiz.", {
      noteId
    });
  }
}
