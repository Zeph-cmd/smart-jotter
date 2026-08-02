import { NextResponse } from "next/server";
import { getAudioQuotaSummary } from "@/lib/ai/entitlements";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";

export async function GET() {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    const summary = await getAudioQuotaSummary(supabase, userId);

    return NextResponse.json(summary);
  } catch (error) {
    return handleRouteError(
      "api-ai-transcribe-quota-get",
      error,
      "Could not load audio quota."
    );
  }
}