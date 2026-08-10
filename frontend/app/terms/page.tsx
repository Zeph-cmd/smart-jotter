import type { Metadata } from "next";
import {
  PageList,
  PageParagraph,
  PageSectionHeading,
  PageShell
} from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Terms of Service · Smart Jotter",
  description:
    "The terms and conditions that govern your use of Smart Jotter."
};

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="These terms govern your use of Smart Jotter. Please read them carefully."
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Last updated: {new Date().toLocaleDateString()}
      </p>

      <PageSectionHeading>1. Acceptance of terms</PageSectionHeading>
      <PageParagraph>
        By creating an account or using Smart Jotter ("the Service"),
        you agree to be bound by these Terms of Service. If you do not agree,
        please do not use the Service.
      </PageParagraph>

      <PageSectionHeading>2. Your account</PageSectionHeading>
      <PageList
        items={[
          "You must provide accurate, current information when creating your account.",
          "You are responsible for keeping your password secure and for all activity under your account.",
          "You must be at least 13 years old (or the minimum age required in your country) to use the Service.",
          "You may not share, sell, or transfer your account to another person."
        ]}
      />

      <PageSectionHeading>3. Acceptable use</PageSectionHeading>
      <PageParagraph>
        You agree not to misuse the Service or help anyone else do so. For
        example, you will not:
      </PageParagraph>
      <PageList
        items={[
          "Use the Service for any unlawful, fraudulent, or abusive purpose.",
          "Attempt to access, tamper with, or disrupt our systems, accounts, or data.",
          "Upload content that infringes the rights of others or that is harmful, offensive, or illegal.",
          "Reverse-engineer, decompile, or attempt to extract our source code or proprietary systems."
        ]}
      />

      <PageSectionHeading>4. Your content</PageSectionHeading>
      <PageParagraph>
        You retain ownership of the notes and other content you create in Smart
        Jotter ("Your Content"). You grant us a limited license to
        host, store, and process Your Content solely to operate and provide the
        Service to you. You are responsible for ensuring you have the rights to
        the content you upload.
      </PageParagraph>

      <PageSectionHeading>5. AI features</PageSectionHeading>
      <PageList
        items={[
          "AI features (such as summaries, suggestions, transcription, flashcards, and quizzes) are provided to assist you, but outputs may not always be accurate.",
          "You are responsible for reviewing any AI-generated content before relying on it.",
          "AI features consume credits as described on the Usage page. Plans and allotments may change as the Service evolves."
        ]}
      />

      <PageSectionHeading>6. Plans, credits, and payments</PageSectionHeading>
      <PageList
        items={[
          "Paid plans provide access to AI features and include a monthly allotment of AI credits.",
          "Payments are processed securely by our payment partner, Paystack.",
          "Subscription fees are billed in advance and are generally non-refundable, except where required by law.",
          "Prices and plan features may change; any changes that affect you will be communicated in advance where reasonably possible."
        ]}
      />

      <PageSectionHeading>7. Service availability</PageSectionHeading>
      <PageParagraph>
        We work hard to keep Smart Jotter reliable, but we do not guarantee
        uninterrupted or error-free access. We may modify, suspend, or
        discontinue features at any time, with or without notice.
      </PageParagraph>

      <PageSectionHeading>8. Termination</PageSectionHeading>
      <PageParagraph>
        You may stop using Smart Jotter at any time. We may suspend or
        terminate your account if you violate these Terms or if we believe your
        activity harms the Service or other users.
      </PageParagraph>

      <PageSectionHeading>9. Disclaimers</PageSectionHeading>
      <PageParagraph>
        The Service is provided "as is" and "as available".
        To the fullest extent permitted by law, we disclaim all warranties,
        whether express or implied, including warranties of merchantability,
        fitness for a particular purpose, and non-infringement.
      </PageParagraph>

      <PageSectionHeading>10. Limitation of liability</PageSectionHeading>
      <PageParagraph>
        To the maximum extent permitted by law, Smart Jotter shall not be
        liable for any indirect, incidental, special, or consequential damages,
        or any loss of data, arising from your use of the Service.
      </PageParagraph>

      <PageSectionHeading>11. Changes to these terms</PageSectionHeading>
      <PageParagraph>
        We may update these Terms from time to time. We will post the updated
        version on this page and revise the "Last updated" date.
        Continued use of the Service after changes take effect means you accept
        the revised Terms.
      </PageParagraph>

      <PageSectionHeading>12. Contact</PageSectionHeading>
      <PageParagraph>
        Questions about these Terms? Email us at{" "}
        <a
          href="mailto:support@smartjotter.com"
          className="font-medium text-slate-700 underline transition hover:text-ink dark:text-slate-200 dark:hover:text-white"
        >
          support@smartjotter.com
        </a>
        .
      </PageParagraph>
    </PageShell>
  );
}