import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/errors";
import { handleRouteError } from "@/lib/server/route";
import {
  assertAmountMatches,
  createServiceRoleSupabaseClient,
  extractMetadata,
  grantPlanEntitlements,
  isTransactionProcessed,
  markTransactionProcessed,
  verifyPaystackTransaction
} from "@/lib/paystack/server";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

/**
 * POST /api/paystack/verify
 *
 * Called from the browser immediately after the Paystack popup reports a
 * successful payment. This route is the authoritative gate: it verifies the
 * transaction with Paystack's server, checks the amount/currency, validates
 * the plan metadata, and only then activates the user's entitlements.
 *
 * The webhook (/api/paystack/webhook) is a backup in case the browser is
 * closed before this route runs.
 *
 * Body: { reference: string }
 */
export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    // Rate limit per user to prevent abuse of the verify endpoint.
    const { ok, retryAfter } = checkRateLimit(
      `paystack-verify:${userId}`,
      RATE_LIMITS.paymentVerify.limit,
      RATE_LIMITS.paymentVerify.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Parse + validate the request body.
    const body = (await request.json().catch(() => null)) as
      | { reference?: unknown }
      | null;

    const reference =
      typeof body?.reference === "string" ? body.reference.trim() : "";

    if (!reference) {
      throw new ApiError("Missing transaction reference.", 400);
    }

    // 1. Verify with Paystack (server-side, secret key).
    const data = await verifyPaystackTransaction(reference);

    // 2. Extract + validate plan metadata attached to the transaction.
    const metadata = extractMetadata(data.metadata);

    // Security: ensure the metadata user_id matches the signed-in user.
    if (metadata.user_id !== userId) {
      throw new ApiError(
        "Transaction user mismatch. Please contact support.",
        403
      );
    }

    // 3. Confirm the amount/currency matches the expected plan price.
    assertAmountMatches(data, metadata);

    // 4. Idempotency check — prevent replay attacks from re-granting
    //    entitlements on an already-processed transaction.
    const serviceSupabase = createServiceRoleSupabaseClient();
    const alreadyProcessed = await isTransactionProcessed(serviceSupabase, reference);

    if (alreadyProcessed) {
      // Already granted by this route or the webhook. Return success without
      // re-running the grant (which would refresh the expiry date).
      return NextResponse.json({
        success: true,
        message: "This payment has already been processed.",
        duplicate: true
      });
    }

    // 5. Grant entitlements via the service-role client (bypasses RLS).
    const result = await grantPlanEntitlements(serviceSupabase, metadata);

    // 6. Record in the idempotency ledger.
    await markTransactionProcessed(serviceSupabase, reference, metadata, data.amount, data.currency);

    // Best-effort: refresh the user's Supabase session so the client sees the
    // new entitlements immediately without a hard reload.
    await supabase.auth.refreshSession().catch(() => {
      /* non-fatal */
    });

    return NextResponse.json({
      success: true,
      message: `${result.activated === "stt" ? "Speech-to-Text" : "AI Writing Assist"} plan activated successfully.`,
      plan: result
    });
  } catch (error) {
    return handleRouteError(
      "api-paystack-verify",
      error,
      "Payment verification failed. If you were charged, please contact support."
    );
  }
}