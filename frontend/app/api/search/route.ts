import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { semanticSearch } from "@/lib/search/semantic-search";
import { enforceCredits, recordAiUsage } from "@/lib/ai/credits";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

const MAX_QUERY_LENGTH = 2000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: "Query is required." },
      { status: 400 }
    );
  }

  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Search query is too long." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    // Rate limit per user.
    const { ok, retryAfter } = checkRateLimit(
      `search:${userId}`,
      RATE_LIMITS.ai.limit,
      RATE_LIMITS.ai.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const cost = await enforceCredits(supabase, userId, "semantic_search");
    const notes = await semanticSearch(supabase, userId, query);
    await recordAiUsage(supabase, userId, "semantic_search", cost);

    return NextResponse.json({ notes });
  } catch (error) {
    return handleRouteError("api-search-get", error, "Could not search your notes.", {
      query
    });
  }
}
