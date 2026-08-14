import type { Metadata } from "next";
import {
  PageList,
  PageParagraph,
  PageSectionHeading,
  PageShell
} from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "About · Smart Jotter",
  description:
    "Smart Jotter is a minimal note-taking app built to grow into an AI-first knowledge system for students, professionals, and lifelong learners."
};

export default function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="What is Smart Jotter?"
      subtitle="A calm place to capture notes with an AI companion that helps you turn them into real understanding."
    >
      <PageSectionHeading>Our mission</PageSectionHeading>
      <PageParagraph>
        Smart Jotter started as a simple, minimal note-taking app. We believe
        writing things down should be fast, distraction-free, and pleasant,
        whether you're in a lecture, a meeting, or just thinking out loud.
        Around that calm core, we're building AI features that help you
        organize, summarize, and actually learn from what you write.
      </PageParagraph>

      <PageSectionHeading>Who it's for</PageSectionHeading>
      <PageList
        items={[
          "Students capturing lectures, study notes, and revision material.",
          "Professionals keeping meeting notes, action items, and project context.",
          "Lifelong learners collecting ideas, research, and references in one place.",
          "Anyone who wants a fast, no-clutter place to jot things down."
        ]}
      />

      <PageSectionHeading>What you can do today</PageSectionHeading>
      <PageList
        items={[
          "Create and edit notes with a clean, focused editor.",
          "Search across everything you've written.",
          "Get AI suggestions and summaries (available on paid plans).",
          "Turn notes into flashcards and quizzes for active recall.",
          "Track your AI usage and credits from a simple dashboard."
        ]}
      />

      <PageSectionHeading>Where we're headed</PageSectionHeading>
      <PageParagraph>
        Smart Jotter is being carefully grown into an AI-first knowledge
        system. New capabilities are rolled out gradually and only when
        they're genuinely useful, so the app stays simple even as it gets
        smarter. We'd love your feedback on what to build next.
      </PageParagraph>

      <PageSectionHeading>Where the name came from</PageSectionHeading>
      <PageParagraph>
        Smart Jotter started as a conversation, not a plan. A friend of mine,
        Saibu Suale, a pharmacy student at KSTU, was visiting my hostel one
        evening and mentioned the term &ldquo;smart jotter&rdquo; in passing.
        Something about it stuck. I went and dug into the idea afterward and
        realized there was real potential there, and that&rsquo;s how this app
        got its name.
      </PageParagraph>
      <PageParagraph>
        Saibu also writes. His book,{" "}
        <a
          href="/tiktok-trap-interior.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-600 underline transition hover:text-ink dark:text-slate-300 dark:hover:text-white"
        >
          TikTok Trap: Hijacker of Focus
        </a>
        , looks at how short-form platforms like TikTok are built to capture
        attention and shape thinking, and how to use them without losing
        control of your focus. If you&rsquo;ve ever wondered why you can hit
        &ldquo;Not Interested&rdquo; on TikTok but never
        &ldquo;Interested,&rdquo; his book gets into exactly that.{" "}
        <a
          href="/tiktok-trap-interior.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-600 underline transition hover:text-ink dark:text-slate-300 dark:hover:text-white"
        >
          Find it here &rarr;
        </a>
      </PageParagraph>
      <PageParagraph>
        &mdash; Zephaniah Yumpini, Founder, Smart Jotter (
        <a
          href="https://zephobed.me"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-600 underline transition hover:text-ink dark:text-slate-300 dark:hover:text-white"
        >
          zephobed.me
        </a>
        )
      </PageParagraph>
    </PageShell>
  );
}