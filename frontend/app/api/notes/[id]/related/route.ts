import { NextResponse } from "next/server";
import {
  requireAuthenticatedClient,
  requireTermsAccepted,
  requireUserId
} from "@/lib/server/auth";
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
    const userId = requireUserId(user);
    await requireTermsAccepted(supabase, userId);
    const notes = await getRelatedNotes(supabase, userId, id);
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
