import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { reviewFlashcard } from "@/lib/learning/flashcards";
import type { ReviewPerformance } from "@/types/note";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    flashcard_id?: string;
    performance?: ReviewPerformance;
  };
  const flashcardId = body.flashcard_id?.trim();
  const performance = body.performance;

  if (!flashcardId) {
    return NextResponse.json(
      { error: "flashcard_id is required." },
      { status: 400 }
    );
  }

  if (!performance || !["again", "good", "easy"].includes(performance)) {
    return NextResponse.json(
      { error: "Valid performance is required." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const flashcard = await reviewFlashcard(supabase, requireUserId(user), {
      flashcardId,
      performance
    });
    return NextResponse.json({ flashcard });
  } catch (error) {
    return handleRouteError(
      "api-flashcards-review-post",
      error,
      "Could not update that review."
    );
  }
}
