import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { askYourNotes } from "@/lib/ai/answers";
import { enforceCredits, recordAiUsage } from "@/lib/ai/credits";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

const MAX_QUESTION_LENGTH = 2000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { question?: string }
    | null;
  const question = body?.question?.trim() ?? "";

  if (!question) {
    return NextResponse.json(
      { error: "Question is required." },
      { status: 400 }
    );
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: "Question is too long. Please keep it under 2000 characters." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    // Rate limit per user to prevent abuse of expensive AI calls.
    const { ok, retryAfter } = checkRateLimit(
      `ask:${userId}`,
      RATE_LIMITS.ai.limit,
      RATE_LIMITS.ai.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const cost = await enforceCredits(supabase, userId, "ask_notes");
    const result = await askYourNotes(supabase, userId, question);
    await recordAiUsage(supabase, userId, "ask_notes", cost);

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("api-ask-post", error, "Could not answer from your notes.");
  }
}
