import { NextResponse } from "next/server";
import {
  requireAuthenticatedClient,
  requireTermsAccepted,
  requireUserId
} from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { getNoteById, updateNote } from "@/lib/notes-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = (await request.json()) as { title?: string; content?: string };
  const title = body.title?.trim();
  const content = body.content?.trim() ?? "";

  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);
    await requireTermsAccepted(supabase, userId);
    const note = await updateNote(supabase, userId, id, { title, content });
    return NextResponse.json({ note });
  } catch (error) {
    return handleRouteError("api-note-patch", error, "Could not save your note.", {
      noteId: id
    });
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);
    await requireTermsAccepted(supabase, userId);
    const note = await getNoteById(supabase, userId, id);

    if (!note) {
      return NextResponse.json(
        { error: "Note not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ note });
  } catch (error) {
    return handleRouteError("api-note-get", error, "Could not load that note.", {
      noteId: id
    });
  }
}
