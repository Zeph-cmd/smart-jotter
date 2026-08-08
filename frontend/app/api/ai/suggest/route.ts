import { NextResponse } from "next/server";
import { generateSuggestion } from "@/lib/ai/suggestions";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { enforceCredits, recordAiUsage } from "@/lib/ai/credits";
import { suggestionActionToFeature } from "@/lib/credits";
import type { SuggestionAction } from "@/types/note";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: SuggestionAction;
    content?: string;
  };

  const action = body.action;
  const content = body.content?.trim() ?? "";

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

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

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
