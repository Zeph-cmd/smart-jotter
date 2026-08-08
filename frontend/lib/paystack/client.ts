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
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Could not load the Paystack payment script."))
      );
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
 * Opens the Paystack inline popup and resolves with the transaction reference
 * on successful payment. Rejects if the user closes the popup or if Paystack
 * fails to initialise.
 *
 * NOTE: Resolving here only means the popup reported success. The server must
 * still verify the transaction via /api/paystack/verify before trusting it.
 */
export async function payWithPaystack(args: PayWithPaystackArgs): Promise<PaystackResult> {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("Paystack is not configured. Missing NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.");
  }

  await loadPaystackScript();

  if (!window.PaystackPop) {
    throw new Error("Paystack payment library failed to load.");
  }

  const reference = makeReference();

  return new Promise<PaystackResult>((resolve, reject) => {
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
            resolve({ reference: response.reference });
          } else {
            reject(new Error("Paystack did not return a transaction reference."));
          }
        },
        onClose() {
          reject(new Error("Payment window closed before completion."));
        }
      });

      handler.openIframe();
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Could not start Paystack payment."));
    }
  });
}