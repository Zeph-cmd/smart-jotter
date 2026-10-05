import { NextResponse } from "next/server";
import { getPaystackCronSecret } from "@/lib/env";
import { logServerError } from "@/lib/server/errors";
import {
  chargeAuthorization,
  createServiceRoleSupabaseClient,
  grantPlanEntitlements,
  markTransactionProcessed,
  type PaystackMetadata
} from "@/lib/paystack/server";

/**
 * POST /api/paystack/renew-cron
 *
 * Daily Vercel Cron job (see vercel.json) that auto-renews expiring
 * subscriptions for users who have not unsubscribed.
 *
 * For every entitlement row whose plan end date is today (or passed):
 *   - auto-renew ON  -> re-charge the saved card via Paystack
 *       success: grant a fresh plan period (new expiry + credits/minutes)
 *                and record the renewal in the transactions ledger
 *       failure: expire the plan quietly (user can resubscribe manually)
 *   - auto-renew OFF -> the lazy expiry normalization in the app handles the
 *     transition; nothing is charged and nothing is written here.
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (set in Vercel env vars).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  try {
    if (token !== getPaystackCronSecret()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    // CRON_SECRET not configured.
    return NextResponse.json(
      { error: "Cron secret not configured." },
      { status: 500 }
    );
  }

  const supabase = createServiceRoleSupabaseClient();

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const summary = {
    ai: { renewed: 0, expired: 0, errors: 0 },
    stt: { renewed: 0, expired: 0, errors: 0 }
  };

  try {
    // ------------------------------------------------------------------
    // AI Writing Assist renewals
    // ------------------------------------------------------------------
    const { data: aiRows, error: aiError } = await supabase
      .from("sj_user_entitlements")
      .select("user_id, ai_last_plan_id")
      .eq("ai_subscription_status", "active")
      .eq("auto_renew_ai", true)
      .lte("ai_subscription_expiry", today)
      .not("ai_last_plan_id", "is", null);

    if (aiError) {
      throw new Error(`AI renewals query failed: ${aiError.message}`);
    }

    for (const row of aiRows ?? []) {
      const metadata: PaystackMetadata = {
        user_id: row.user_id,
        plan_type: "ai",
        plan_id: row.ai_last_plan_id as PaystackMetadata["plan_id"]
      };

      try {
        const charge = await chargeAuthorization(supabase, row.user_id, metadata);

        if (charge.ok) {
          await grantPlanEntitlements(supabase, metadata);
          await markTransactionProcessed(
            supabase,
            charge.reference,
            metadata,
            charge.amountMinor,
            charge.currency
          );
          summary.ai.renewed += 1;
        } else {
          // Quiet expiry: terminate the plan and its remaining credits.
          const { error: expireError } = await supabase
            .from("sj_user_entitlements")
            .update({
              ai_subscription_status: "expired",
              credits_allotted: 0,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", row.user_id);

          if (expireError) {
            logServerError("renew-cron-ai-expire", expireError, {
              userId: row.user_id
            });
            summary.ai.errors += 1;
          } else {
            summary.ai.expired += 1;
          }
        }
      } catch (rowError) {
        summary.ai.errors += 1;
        logServerError("renew-cron-ai-row", rowError, { userId: row.user_id });
      }
    }

    // ------------------------------------------------------------------
    // Speech-to-Text renewals
    // ------------------------------------------------------------------
    const { data: sttRows, error: sttError } = await supabase
      .from("sj_user_entitlements")
      .select("user_id, stt_last_plan_id")
      .eq("subscription_status", "active")
      .eq("auto_renew_stt", true)
      .lte("subscription_expiry", today)
      .not("stt_last_plan_id", "is", null);

    if (sttError) {
      throw new Error(`STT renewals query failed: ${sttError.message}`);
    }

    for (const row of sttRows ?? []) {
      const metadata: PaystackMetadata = {
        user_id: row.user_id,
        plan_type: "stt",
        plan_id: row.stt_last_plan_id as PaystackMetadata["plan_id"]
      };

      try {
        const charge = await chargeAuthorization(supabase, row.user_id, metadata);

        if (charge.ok) {
          await grantPlanEntitlements(supabase, metadata);
          await markTransactionProcessed(
            supabase,
            charge.reference,
            metadata,
            charge.amountMinor,
            charge.currency
          );
          summary.stt.renewed += 1;
        } else {
          const { error: expireError } = await supabase
            .from("sj_user_entitlements")
            .update({
              subscription_status: "expired",
              subscription_minutes_allotted: 0,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", row.user_id);

          if (expireError) {
            logServerError("renew-cron-stt-expire", expireError, {
              userId: row.user_id
            });
            summary.stt.errors += 1;
          } else {
            summary.stt.expired += 1;
          }
        }
      } catch (rowError) {
        summary.stt.errors += 1;
        logServerError("renew-cron-stt-row", rowError, { userId: row.user_id });
      }
    }

    return NextResponse.json({ success: true, date: today, summary });
  } catch (error) {
    logServerError("api-paystack-renew-cron", error);
    return NextResponse.json(
      { error: "Renewal run failed. Check server logs." },
      { status: 500 }
    );
  }
}
