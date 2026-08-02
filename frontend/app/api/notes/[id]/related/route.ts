import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { getRelatedNotes } from "@/lib/graph/related-notes";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const notes = await getRelatedNotes(supabase, requireUserId(user), id);
    return NextResponse.json({ notes });
  } catch (error) {
    return handleRouteError(
      "api-related-notes-get",
      error,
      "Could not load related notes.",
      { noteId: id }
    );
  }
}
