import { NextResponse } from "next/server";
import { extractTextFromImage, extractTextFromPdf } from "@/lib/ai/extract";
import { enforceCredits, recordAiUsage } from "@/lib/ai/credits";
import {
  requireAuthenticatedClient,
  requireTermsAccepted,
  requireUserId
} from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";
import {
  checkRateLimit,
  RATE_LIMITS
} from "@/lib/server/rate-limit";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
/** Volume guardrail: PDFs beyond this many pages must be split by the user. */
const MAX_PDF_PAGES = 20;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const userId = requireUserId(user);
    await requireTermsAccepted(supabase, userId);

    // Rate limit per user — extraction is heavy (vision calls / large parses).
    const { ok, retryAfter } = checkRateLimit(
      `extract:${userId}`,
      RATE_LIMITS.extract.limit,
      RATE_LIMITS.extract.windowMs
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const formData = await request.formData();
    const candidate = formData.get("file");

    if (!(candidate instanceof File)) {
      return NextResponse.json(
        { error: "Please choose an image or PDF file." },
        { status: 400 }
      );
    }

    const type = candidate.type;

    // -----------------------------------------------------------------------
    // Image path: bounded vision call, 2 credits charged before the call.
    // -----------------------------------------------------------------------
    if (ALLOWED_IMAGE_TYPES.has(type)) {
      if (candidate.size === 0) {
        return NextResponse.json({ error: "The image is empty." }, { status: 400 });
      }
      if (candidate.size > MAX_IMAGE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Image is too large. Max size is 5MB — try a screenshot of the section you need." },
          { status: 400 }
        );
      }

      const cost = await enforceCredits(supabase, userId, "image_extract");

      const buffer = await candidate.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${type};base64,${base64}`;

      const text = await extractTextFromImage(dataUrl);

      await recordAiUsage(supabase, userId, "image_extract", cost);

      return NextResponse.json({ text, source: "image" });
    }

    // -----------------------------------------------------------------------
    // PDF path: parsed with code only (no AI). Credits are charged AFTER a
    // text layer is confirmed, so scanned-PDF rejections never cost anything.
    // -----------------------------------------------------------------------
    if (type === "application/pdf") {
      if (candidate.size === 0) {
        return NextResponse.json({ error: "The PDF is empty." }, { status: 400 });
      }
      if (candidate.size > MAX_PDF_SIZE_BYTES) {
        return NextResponse.json(
          { error: "PDF is too large. Max size is 10MB — split it and upload the parts you need." },
          { status: 400 }
        );
      }

      const buffer = await candidate.arrayBuffer();
      const { text, pages } = await extractTextFromPdf(buffer);

      if (pages > MAX_PDF_PAGES) {
        return NextResponse.json(
          {
            error: `This PDF has ${pages} pages. Max is ${MAX_PDF_PAGES} per upload — split it and import the parts you need.`
          },
          { status: 400 }
        );
      }

      if (!text) {
        return NextResponse.json(
          {
            error:
              "This PDF has no text layer (it looks scanned). Export its pages as images and upload those instead — nothing was charged."
          },
          { status: 422 }
        );
      }

      const cost = await enforceCredits(supabase, userId, "pdf_extract");
      await recordAiUsage(supabase, userId, "pdf_extract", cost);

      return NextResponse.json({ text, source: "pdf", pages });
    }

    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPG, PNG, WebP image, or a PDF." },
      { status: 400 }
    );
  } catch (error) {
    return handleRouteError(
      "api-ai-extract-post",
      error,
      "Could not extract text from this file."
    );
  }
}
