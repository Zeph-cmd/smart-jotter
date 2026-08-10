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
      subtitle="A calm place to capture notes — and an AI companion that helps you turn them into real understanding."
    >
      <PageSectionHeading>Our mission</PageSectionHeading>
      <PageParagraph>
        Smart Jotter started as a simple, minimal note-taking app. We believe
        writing things down should be fast, distraction-free, and pleasant —
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
        they're genuinely useful — so the app stays simple even as it gets
        smarter. We'd love your feedback on what to build next.
      </PageParagraph>
    </PageShell>
  );
}