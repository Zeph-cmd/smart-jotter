import { NextResponse } from "next/server";
import { generateFlashcardsPreview } from "@/lib/ai/flashcards-preview";
import {
  requireAuthenticatedClient,
  requireTermsAccepted,
  requireUserId
} from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { enforceCredits, recordAiUsage } from "@/lib/ai/credits";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

const MAX_CONTENT_LENGTH = 20000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    content?: string;
  } | null;

  const content = body?.content?.trim() ?? "";

  if (!content) {
    return NextResponse.json(
      { error: "Content is required." },
      { status: 400 }
    );
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json(
      { error: "Content is too long. Please shorten your note." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);
    await requireTermsAccepted(supabase, userId);

    // Rate limit per user (same bucket shape as the other AI tools).
    const { ok, retryAfter } = checkRateLimit(
      `ai-flashcards:${userId}`,
      RATE_LIMITS.ai.limit,
      RATE_LIMITS.ai.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Reuse the exact credit gate as Explain/Improve.
    const cost = await enforceCredits(supabase, userId, "flashcards");

    const flashcards = await generateFlashcardsPreview(content);

    await recordAiUsage(supabase, userId, "flashcards", cost);

    return NextResponse.json({ flashcards });
  } catch (error) {
    return handleRouteError(
      "api-ai-flashcards-post",
      error,
      "Could not generate flashcards."
    );
  }
}