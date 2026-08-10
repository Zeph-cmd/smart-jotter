import { NextResponse } from "next/server";
import {
  requireAuthenticatedClient,
  requireTermsAccepted,
  requireUserId
} from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { createNote, getNotes } from "@/lib/notes-service";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);
    await requireTermsAccepted(supabase, userId);
    const notes = await getNotes(supabase, userId);
    return NextResponse.json({ notes });
  } catch (error) {
    return handleRouteError("api-notes-get", error, "Could not load your notes.");
  }
}

export async function POST(request: Request) {
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
    const note = await createNote(supabase, userId, { title, content });
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return handleRouteError("api-notes-post", error, "Could not create your note.");
  }
}
