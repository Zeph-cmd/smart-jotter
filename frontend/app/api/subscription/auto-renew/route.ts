import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/errors";
import { handleRouteError } from "@/lib/server/route";

/**
 * POST /api/subscription/auto-renew
 *
 * Toggles the signed-in user's auto-renew preference for one subscription
 * track. Both flags default to true; turning a flag off stops the daily
 * renew job from re-charging that track when the plan's end date arrives.
 *
 * Body: { track: "ai" | "stt", enabled: boolean }
 */
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    const body = (await request.json().catch(() => null)) as {
      track?: unknown;
      enabled?: unknown;
    } | null;

    if (body?.track !== "ai" && body?.track !== "stt") {
      throw new ApiError('Invalid track. Expected "ai" or "stt".', 400);
    }

    if (typeof body?.enabled !== "boolean") {
      throw new ApiError("Invalid enabled value. Expected true or false.", 400);
    }

    const column = body.track === "ai" ? "auto_renew_ai" : "auto_renew_stt";

    const { error } = await supabase
      .from("sj_user_entitlements")
      .upsert(
        {
          user_id: userId,
          [column]: body.enabled
        },
        { onConflict: "user_id" }
      );

    if (error) {
      throw new Error(`Could not update auto-renew setting: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      track: body.track,
      auto_renew: body.enabled
    });
  } catch (error) {
    return handleRouteError(
      "api-subscription-auto-renew",
      error,
      "Could not update your auto-renew setting. Please try again."
    );
  }
}
