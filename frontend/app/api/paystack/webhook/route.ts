import { NextResponse } from "next/server";
import { logServerError } from "@/lib/server/errors";
import {
  assertAmountMatches,
  createServiceRoleSupabaseClient,
  extractMetadata,
  grantPlanEntitlements,
  isTransactionProcessed,
  markTransactionProcessed,
  verifyPaystackTransaction,
  verifyWebhookSignature
} from "@/lib/paystack/server";

/**
 * POST /api/paystack/webhook
 *
 * Backup safety net for Paystack `charge.success` events. If the browser is
 * closed before /api/paystack/verify runs, this webhook still grants the
 * entitlements.
 *
 * Flow:
 *   1. Read the RAW request body (signature is computed over raw bytes).
 *   2. Verify the HMAC-SHA512 signature using PAYSTACK_SECRET_KEY.
 *   3. Only process `charge.success` events.
 *   4. Re-verify the transaction with Paystack's verify endpoint (never trust
 *      the payload alone).
 *   5. Grant entitlements (idempotent — safe even if /verify already ran).
 *
 * Add this URL to Paystack's Dashboard → Settings → Webhooks.
 */

type PaystackWebhookEvent = {
  event: string;
  data: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: unknown;
  };
};

export async function POST(request: Request) {
  try {
    // 1. Read the raw body — the signature is computed over the exact bytes.
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");

    // 2. Verify the HMAC signature.
    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    // 3. Parse the payload.
    let payload: PaystackWebhookEvent;
    try {
      payload = JSON.parse(rawBody) as PaystackWebhookEvent;
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    // 4. Only handle successful charge events.
    if (payload.event !== "charge.success") {
      // Acknowledge other events so Paystack doesn't retry.
      return NextResponse.json({ received: true, ignored: payload.event });
    }

    const reference = payload.data?.reference;
    if (!reference) {
      return NextResponse.json({ error: "Missing reference." }, { status: 400 });
    }

    // 5. Re-verify with Paystack (never trust the webhook payload alone).
    const data = await verifyPaystackTransaction(reference);

    // 6. Validate metadata + amount.
    const metadata = extractMetadata(data.metadata);
    assertAmountMatches(data, metadata);

    // 7. Idempotency check — skip if already processed by /verify or a
    //    previous webhook delivery.
    const serviceSupabase = createServiceRoleSupabaseClient();
    const alreadyProcessed = await isTransactionProcessed(serviceSupabase, reference);

    if (alreadyProcessed) {
      return NextResponse.json({ success: true, duplicate: true });
    }

    // 8. Grant entitlements, then record in the ledger.
    await grantPlanEntitlements(serviceSupabase, metadata);
    await markTransactionProcessed(serviceSupabase, reference, metadata, data.amount, data.currency);

    return NextResponse.json({ success: true });
  } catch (error) {
    logServerError("api-paystack-webhook", error);
    // Return 500 so Paystack retries (idempotent grant makes retries safe).
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}