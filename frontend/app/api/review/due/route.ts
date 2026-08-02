import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { getDueFlashcards } from "@/lib/learning/flashcards";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const flashcards = await getDueFlashcards(supabase, requireUserId(user));
    return NextResponse.json({
      due_count: flashcards.length,
      flashcards
    });
  } catch (error) {
    return handleRouteError("api-review-due-get", error, "Could not load due reviews.");
  }
}
