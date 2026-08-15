import { NextResponse } from "next/server";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/errors";
import { handleRouteError } from "@/lib/server/route";
import { checkRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import {
  createServiceRoleSupabaseClient,
  isValidPaystackReference
} from "@/lib/paystack/server";

/**
 * GET /api/payments/status?reference=<string>
 *
 * Read-only status check for a Paystack payment reference, scoped to the
 * signed-in user. Clients (e.g. the Android app) poll this after returning
 * from a payment to learn whether the entitlement grant recorded by
 * /api/paystack/verify or /api/paystack/webhook has landed yet.
 *
 * This route NEVER writes and NEVER calls Paystack — it only reads what the
 * verify/webhook routes have already recorded in the
 * `sj_paystack_transactions` idempotency ledger (a row there means the grant
 * completed).
 *
 * Security:
 *   - Requires the same authenticated user context as the other API routes.
 *   - The lookup is filtered by user_id, so a caller can only ever see their
 *     OWN references.
 *   - A miss (reference belongs to someone else, doesn't exist, or simply
 *     hasn't been processed yet) always returns the same opaque "not_found"
 *     payload with HTTP 200 — no 403/404 distinction — so the existence of
 *     other users' references cannot be probed.
 *
 * Response:
 *   {
 *     reference: string,
 *     status: "success" | "not_found",
 *     grantedAt: string | null,  // ISO timestamp when the grant was recorded
 *     planId: string | null      // plan this reference corresponds to
 *   }
 *
 *   "success"   — the ledger has a completed grant for this reference owned
 *                 by the caller; grantedAt/planId are populated.
 *   "not_found" — no completed grant is visible to this user.
 *
 *   ("pending" / "failed" are part of the status contract but are not
 *   emitted today: the ledger only records completed grants, and a
 *   not-yet-processed reference is — by design — indistinguishable from a
 *   nonexistent one, so any miss maps to "not_found".)
 */

type PaymentStatusRow = {
  reference: string;
  plan_id: string;
  processed_at: string;
};

export async function GET(request: Request) {
  try {
    const { user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);

    // Light rate limit — clients poll this endpoint every few seconds right
    // after a payment return, so this is deliberately looser than the
    // paymentVerify preset.
    const { ok, retryAfter } = checkRateLimit(
      `payment-status:${userId}`,
      RATE_LIMITS.paymentStatus.limit,
      RATE_LIMITS.paymentStatus.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many status checks. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    // Parse + validate the query parameter.
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get("reference")?.trim() ?? "";

    if (!reference) {
      throw new ApiError("Missing payment reference.", 400);
    }

    if (!isValidPaystackReference(reference)) {
      throw new ApiError("Invalid payment reference format.", 400);
    }

    // Read the ledger with the service-role client: the table is RLS-locked
    // with no policies, so user-scoped clients cannot read it directly (same
    // pattern as /api/paystack/verify and the webhook).
    const serviceSupabase = createServiceRoleSupabaseClient();

    const { data, error } = await serviceSupabase
      .from("sj_paystack_transactions")
      .select("reference, plan_id, processed_at")
      .eq("reference", reference)
      .eq("user_id", userId) // user-scoped: own references only
      .maybeSingle();

    if (error) {
      throw new ApiError("Could not check payment status.", 500);
    }

    if (data) {
      const row = data as PaymentStatusRow;
      return NextResponse.json({
        reference,
        status: "success",
        grantedAt: row.processed_at
          ? new Date(row.processed_at).toISOString()
          : null,
        planId: row.plan_id ?? null
      });
    }

    // Miss — not the caller's reference, not yet processed, or nonexistent.
    // Uniform 200 response so reference existence cannot be probed.
    return NextResponse.json({
      reference,
      status: "not_found",
      grantedAt: null,
      planId: null
    });
  } catch (error) {
    return handleRouteError(
      "api-payments-status",
      error,
      "Could not check payment status."
    );
  }
}