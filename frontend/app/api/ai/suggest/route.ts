import { NextResponse } from "next/server";
import { generateSuggestion } from "@/lib/ai/suggestions";
import { requireAuthenticatedClient } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import type { SuggestionAction } from "@/types/note";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: SuggestionAction;
    content?: string;
  };

  const action = body.action;
  const content = body.content?.trim() ?? "";

  if (!action || !["expand", "simplify", "explain", "improve"].includes(action)) {
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
    await requireAuthenticatedClient();
    const suggestion = await generateSuggestion({ action, content });
    return NextResponse.json({ suggestion });
  } catch (error) {
    return handleRouteError(
      "api-ai-suggest-post",
      error,
      "Could not generate a suggestion."
    );
  }
}
