import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { semanticSearch } from "@/lib/search/semantic-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Query is required." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const notes = await semanticSearch(supabase, requireUserId(user), query);
    return NextResponse.json({ notes });
  } catch (error) {
    return handleRouteError("api-search-get", error, "Could not search your notes.", {
      query
    });
  }
}
