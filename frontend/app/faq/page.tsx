import type { Metadata } from "next";
import { PageParagraph, PageShell } from "@/components/ui/page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "FAQ · Smart Jotter",
  description:
    "Answers to common questions about Smart Jotter: accounts, notes, AI features, payments, and privacy.",
  path: "/faq"
});

type FAQItem = {
  question: string;
  answer: string;
};

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "What is Smart Jotter?",
    answer:
      "Smart Jotter is a minimal note-taking app that is growing into an AI-first knowledge system. You can capture and organize notes, search them, and use optional AI features like summaries, suggestions, flashcards, and quizzes."
  },
  {
    question: "Do I need an account to use it?",
    answer:
      "You can browse the site without an account, but you need to sign up to create and save notes, subscribe to a plan, or use AI features."
  },
  {
    question: "Is Smart Jotter free to use?",
    answer:
      "Yes. Core note-taking is free forever, and every new account gets 60 free AI starter credits plus 60 minutes of lifetime speech-to-text. When you need more, you can subscribe to an AI Writing Assist plan (for credits) or a Speech-to-Text plan (for recording time)."
  },
  {
    question: "What are AI credits?",
    answer:
      "AI credits are the units consumed by AI-powered features: Improve, Explain, Semantic Search, and Flashcard generation each cost 1 credit per use; Ask Your Notes costs 2. Paid plans give you a fresh bundle of credits — AI Plan A gives 100 credits for 1 week (50 GHS / $20 USD) and AI Plan B gives 200 credits for 1 month (100 GHS / $40 USD). Track everything on the Usage page."
  },
  {
    question: "Do unused credits roll over?",
    answer:
      "No. On every plan, any credits (or plan recording time) you haven't used simply end at the plan's end date. There is no rollover, so make the most of your plan while it's active."
  },
  {
    question: "Does my plan auto-renew?",
    answer:
      "Yes. Both AI Writing Assist and Speech-to-Text plans renew automatically at the end of the billing period so your access continues uninterrupted. You can turn this off anytime with the auto-renew toggle on the Usage page — your plan then simply ends on its expiry date. If a renewal payment fails, the plan expires quietly and you can resubscribe manually whenever you like."
  },
  {
    question: "How do payments work?",
    answer:
      "Payments are securely processed by Paystack. When you subscribe to a paid plan, you can pay using your preferred supported method. Your subscription status and expiry date are shown on the Usage page."
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Yes — no lock-in. Turn off auto-renew with the toggle on the Usage page and your plan will not be renewed. Your access continues until the end of the period you've already paid for, after which your account returns to the free tier."
  },
  {
    question: "Where are my notes stored?",
    answer:
      "Your notes are stored securely in our database and are tied to your account. We do not sell your data. See our Privacy Policy for details on what we collect and how we use it."
  },
  {
    question: "Is my data used to train AI models?",
    answer:
      "No. We do not use your private notes to train AI models. AI features process your content only to provide the feature you requested (for example, generating a summary)."
  },
  {
    question: "How do I get help or give feedback?",
    answer:
      "Visit our Contact & Feedback page, or email support@smartjotter.com. We respond as quickly as we can and love hearing suggestions for new features."
  }
];

export default function FAQPage() {
  return (
    <PageShell
      eyebrow="Help"
      title="Frequently Asked Questions"
      subtitle="Quick answers to the things people ask most. Can't find what you need? Reach out via the Contact page."
    >
      <div className="divide-y divide-line/60">
        {FAQ_ITEMS.map((item) => (
          <div key={item.question} className="py-5 first:pt-0 last:pb-0">
            <h2 className="text-base font-semibold text-ink dark:text-slate-100">
              {item.question}
            </h2>
            <p className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-300">
              {item.answer}
            </p>
          </div>
        ))}
      </div>

      <PageParagraph>
        Still have questions? Email us at{" "}
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