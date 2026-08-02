import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { askYourNotes } from "@/lib/ai/answers";

export async function POST(request: Request) {
  const body = (await request.json()) as { question?: string };
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json(
      { error: "Question is required." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const result = await askYourNotes(supabase, requireUserId(user), question);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError("api-ask-post", error, "Could not answer from your notes.");
  }
}
