import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import { ensureAiStarterCredits } from "@/lib/ai/credits";

export async function POST() {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);
    await ensureAiStarterCredits(supabase, userId);
    return NextResponse.json({ success: true, message: "Starter credits initialized." });
  } catch (error) {
    return handleRouteError("api-usage-init", error, "Repair failed.");
  }
}
