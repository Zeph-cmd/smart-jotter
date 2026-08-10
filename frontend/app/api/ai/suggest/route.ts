import { NextResponse } from "next/server";
import { generateSuggestion } from "@/lib/ai/suggestions";
import {
  requireAuthenticatedClient,
  requireTermsAccepted,
  requireUserId
} from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { enforceCredits, recordAiUsage } from "@/lib/ai/credits";
import { suggestionActionToFeature } from "@/lib/credits";
import type { SuggestionAction } from "@/types/note";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

const MAX_CONTENT_LENGTH = 20000;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: SuggestionAction;
    content?: string;
  } | null;

  const action = body?.action;
  const content = body?.content?.trim() ?? "";

  if (!action || !["simplify", "explain", "improve"].includes(action)) {
    return NextResponse.json(
      { error: "Valid action is required." },
      { status: 400 }
    );
  }

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

    // Rate limit per user.
    const { ok, retryAfter } = checkRateLimit(
      `suggest:${userId}`,
      RATE_LIMITS.ai.limit,
      RATE_LIMITS.ai.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const feature = suggestionActionToFeature(action);
    const cost = feature
      ? await enforceCredits(supabase, userId, feature)
      : 0;

    const suggestion = await generateSuggestion({ action, content });

    if (feature) {
      await recordAiUsage(supabase, userId, feature, cost);
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    return handleRouteError(
      "api-ai-suggest-post",
      error,
      "Could not generate a suggestion."
    );
  }
}
