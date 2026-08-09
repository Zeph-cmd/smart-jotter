/**
 * Paystack client-side helper.
 *
 * Loads the official inline JS popup (https://js.paystack.co/v1/inline.js)
 * and wraps PaystackPop.setup() in a typed Promise that resolves with the
 * transaction reference on success, or rejects on close/error.
 *
 * Why inline JS (not the npm package)?
 *   - No SSR/hydration concerns in Next.js App Router.
 *   - Zero extra dependencies; the script is loaded lazily on first use.
 *   - This is the approach recommended by Paystack for SPAs.
 */

import type { PaystackMetadata } from "@/lib/paystack/types";

/* -------------------------------------------------------------------------- */
/* Types (minimal subset of the global PaystackPop object)                    */
/* -------------------------------------------------------------------------- */

type PaystackPopResponse = {
  reference: string;
  status: string;
  trans?: string;
  transaction?: string;
  message?: string;
};

type PaystackPopConfig = {
  key: string;
  email: string;
  amount: number; // smallest currency unit (kobo/cent)
  currency: string;
  ref: string;
  metadata: PaystackMetadata;
  callback: (response: PaystackPopResponse) => void;
  onClose: () => void;
};

declare global {
  interface Window {
    PaystackPop?: {
      setup: (config: PaystackPopConfig) => { openIframe: () => void };
    };
  }
}

export type PayWithPaystackArgs = {
  email: string;
  /** Amount in MAJOR units (e.g. 50 for 50 GHS). Converted to kobo internally. */
  amountGhs: number;
  currency?: string;
  metadata: PaystackMetadata;
};

export type PaystackResult = {
  reference: string;
};

const PAYSTACK_SCRIPT_URL = "https://js.paystack.co/v1/inline.js";
const PAYSTACK_SCRIPT_ID = "smart-jotter-paystack-inline";

let scriptLoadPromise: Promise<void> | null = null;

/** Loads the Paystack inline script exactly once. */
function loadPaystackScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Paystack can only be used in the browser."));
  }

  if (window.PaystackPop) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(PAYSTACK_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing) {
      if (window.PaystackPop) {
        resolve();
        return;
      }
      // Script tag exists but hasn't initialised yet. Attach listeners, plus a
      // timeout in case the load/error events already fired before we attached
      // (which would otherwise leave this Promise pending forever).
      const existingTimeout = window.setTimeout(() => {
        if (window.PaystackPop) {
          resolve();
        } else {
          reject(new Error("Could not load the Paystack payment script."));
        }
      }, 15_000);
      existing.addEventListener("load", () => {
        window.clearTimeout(existingTimeout);
        resolve();
      });
      existing.addEventListener("error", () => {
        window.clearTimeout(existingTimeout);
        reject(new Error("Could not load the Paystack payment script."));
      });
      return;
    }

    const script = document.createElement("script");
    script.id = PAYSTACK_SCRIPT_ID;
    script.src = PAYSTACK_SCRIPT_URL;
    script.async = true;

    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () =>
      reject(new Error("Could not load the Paystack payment script."))
    );

    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/** Generates a unique transaction reference. */
function makeReference(): string {
  const random = Math.floor(Math.random() * 100_000_000_000).toString(36);
  const ts = Date.now().toString(36);
  return `SJ-${ts}-${random}`;
}

/**
 * How long to wait after calling openIframe() before deciding the popup failed
 * to appear (e.g. blocked key, ad-blocker, or Paystack error). Chosen to be
 * long enough that a slow network can still inject the iframe, but short enough
 * that the user isn't left staring at a "Processing…" button forever.
 */
const POPUP_OPEN_TIMEOUT_MS = 8_000;

/**
 * Absolute backstop: even in pathological cases where neither callback fires
 * and our DOM probe is fooled, never leave the Promise pending forever.
 * (A real user entering card details will interact within this window; if they
 * walk away, onClose fires when they return and close the tab.)
 */
const PAYMENT_HARD_TIMEOUT_MS = 5 * 60_000; // 5 minutes

/**
 * Detects whether Paystack's inline popup is present in the DOM. Defensive —
 * never throws. Returns true if any Paystack iframe/overlay is found.
 */
function isPaystackPopupVisible(): boolean {
  try {
    return Boolean(
      document.querySelector('iframe[src*="paystack"]') ||
        document.querySelector('div[id*="paystack"]') ||
        document.querySelector('iframe[id*="paystack"]') ||
        // Paystack inline v1 renders into a container with these markers
        document.querySelector('[class*="paystack"]')
    );
  } catch {
    return false;
  }
}

/**
 * Opens the Paystack inline popup and resolves with the transaction reference
 * on successful payment. Rejects if the user closes the popup, if Paystack
 * fails to initialise, or if the popup fails to appear within a short window.
 *
 * NOTE: Resolving here only means the popup reported success. The server must
 * still verify the transaction via /api/paystack/verify before trusting it.
 */
export async function payWithPaystack(args: PayWithPaystackArgs): Promise<PaystackResult> {
  const rawKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  const publicKey = typeof rawKey === "string" ? rawKey.trim() : undefined;

  // 1. Key presence + format check. A very common silent-failure cause is a
  //    SECRET key (sk_...) being placed in the PUBLIC key env var — Paystack's
  //    inline.js then opens nothing and fires no callback, hanging forever.
  //    Catching this here gives an immediate, actionable error instead.
  if (!publicKey) {
    console.error(
      "[Paystack] NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is missing or empty at runtime. " +
        "Check that it is set in your environment (Vercel > Project > Settings > Environment Variables) " +
        "and that it begins with pk_test_ or pk_live_."
    );
    throw new Error(
      "Payments are not configured on this site (missing public key). Please contact support."
    );
  }

  if (!publicKey.startsWith("pk_")) {
    console.error(
      `[Paystack] NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY does not look like a public key ` +
        `(expected to start with "pk_test_" or "pk_live_"). Got: ${publicKey.slice(0, 6)}…`
    );
    throw new Error(
      "Payments are misconfigured on this site (invalid public key). Please contact support."
    );
  }

  // 2. Email presence check. Paystack's inline.js requires a valid email and
  //    can silently fail to open the popup when given an empty/missing value,
  //    so we fail fast with an actionable message instead.
  const email = typeof args.email === "string" ? args.email.trim() : "";
  if (!email || !email.includes("@")) {
    console.error(
      "[Paystack] No valid email provided to payWithPaystack(). " +
        "The Paystack popup requires a customer email; received an empty/invalid value."
    );
    throw new Error(
      "We couldn't find an email on your account, which Paystack requires for payment. " +
        "Please add an email to your account and try again."
    );
  }

  await loadPaystackScript();

  if (!window.PaystackPop) {
    throw new Error("Paystack payment library failed to load.");
  }

  const reference = makeReference();

  return new Promise<PaystackResult>((resolve, reject) => {
    let settled = false;
    let openProbeTimer: number | undefined;
    let hardTimeoutTimer: number | undefined;

    const cleanup = () => {
      if (openProbeTimer) window.clearTimeout(openProbeTimer);
      if (hardTimeoutTimer) window.clearTimeout(hardTimeoutTimer);
    };

    const succeed = (result: PaystackResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    try {
      const handler = window.PaystackPop!.setup({
        key: publicKey,
        email: args.email,
        amount: Math.round(args.amountGhs * 100), // convert GHS -> kobo
        currency: args.currency ?? "GHS",
        ref: reference,
        metadata: args.metadata,
        callback(response) {
          if (response?.reference) {
            succeed({ reference: response.reference });
          } else {
            fail(new Error("Paystack did not return a transaction reference."));
          }
        },
        onClose() {
          fail(new Error("Payment window closed before completion."));
        }
      });

      handler.openIframe();

      // Probe: if the popup hasn't appeared in the DOM within a few seconds,
      // Paystack silently failed to open (bad key, blocked request, etc.).
      // Without this the Promise would hang forever.
      openProbeTimer = window.setTimeout(() => {
        if (settled) return;
        if (!isPaystackPopupVisible()) {
          console.error(
            "[Paystack] Popup did not appear within the expected time. " +
              "This usually means the public key is invalid, the request was blocked, " +
              "or the Paystack script failed to initialise."
          );
          fail(
            new Error(
              "Could not open the Paystack payment window. Please check your connection, disable ad-blockers, and try again."
            )
          );
        }
      }, POPUP_OPEN_TIMEOUT_MS);

      // Absolute backstop so the Promise can never hang indefinitely.
      hardTimeoutTimer = window.setTimeout(() => {
        if (!settled) {
          fail(
            new Error(
              "Payment timed out. No charge was made — please try again."
            )
          );
        }
      }, PAYMENT_HARD_TIMEOUT_MS);
    } catch (error) {
      fail(error instanceof Error ? error : new Error("Could not start Paystack payment."));
    }
  });
}
