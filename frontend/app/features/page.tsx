import type { Metadata } from "next";
import {
  PageList,
  PageParagraph,
  PageSectionHeading,
  PageShell
} from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Features · Smart Jotter",
  description:
    "See exactly what Smart Jotter can do — when to use each feature, real situations where it helps, and why it matters."
};

export default function FeaturesPage() {
  return (
    <PageShell
      eyebrow="Features"
      title="What Smart Jotter can do"
      subtitle="A quick, plain-English guide to every feature — what it does, when to use it, and why it's worth your time."
    >
      <PageSectionHeading>When to use Smart Jotter</PageSectionHeading>
      <PageList
        items={[
          "In a lecture — capture key points fast, then turn them into flashcards later.",
          "In a meeting — jot action items and decisions before you forget them.",
          "During study sessions — summarize a topic, quiz yourself, and review due cards.",
          "At a conference or event — record ideas and voice notes in real time.",
          "On the go — dictate a thought with speech-to-text and tidy it up later.",
          "While researching — save references, ask your notes a question, and find related ideas.",
          "When planning a project — keep context, tasks, and notes linked together.",
          "At home brainstorming — dump ideas freely, then let AI simplify or sharpen them."
        ]}
      />

      <PageSectionHeading>What each feature does (and when to use it)</PageSectionHeading>
      <PageList
        items={[
          "Notes & Editor — write and edit notes in a clean, distraction-free space. Use for everyday capturing of anything you don't want to forget.",
          "Autosave & Draft Recovery — your work is saved automatically and recovered if you leave mid-edit. Use so you never lose a thought.",
          "Semantic Search — search by meaning, not exact keywords. Use when you remember an idea but not the specific words you wrote.",
          "Ask Your Notes — get a concise answer based only on your saved notes. Use to recall facts or synthesize your own material.",
          "Explain — get a plain-English breakdown of a tricky note. Use when a concept or passage is hard to understand.",
          "Improve — polish your draft for clarity and flow. Use when a note feels rough but the idea is good.",
          "Flashcards — turn a note into study cards automatically. Use when you want to memorize or self-test.",
          "Learning Mode — review flashcards on a spaced-repetition schedule and take quizzes. Use for active recall and exam prep.",
          "Speech-to-Text — dictate and your words are transcribed instantly. Use when your hands are busy or you're moving.",
          "Related Notes — see notes connected to the one you're viewing. Use to rediscover context and build connections.",
          "Export — download notes as .md or .txt. Use to back up or move content into other tools.",
          "Usage Dashboard — track your AI credits and plan status. Use to stay on top of limits and billing."
        ]}
      />

      <PageSectionHeading>Why use Smart Jotter</PageSectionHeading>
      <PageList
        items={[
          "Capture faster — get ideas down with minimal friction, anywhere.",
          "Understand deeper — AI explains and simplifies so learning sticks.",
          "Remember longer — flashcards and spaced repetition beat rereading.",
          "Find anything — semantic search reaches notes you forgot you had.",
          "Stay organized — related notes and tags keep your knowledge connected.",
          "Save time — summaries, quizzes, and answers do the heavy lifting for you.",
          "Own your data — your notes aren't used to train AI models.",
          "Grow with it — core features are free, and AI tools scale with your plan."
        ]}
      />

      <PageParagraph>
        New to Smart Jotter? Start with a single note, try a search, then turn it
        into a few flashcards — that's the whole loop.
      </PageParagraph>
    </PageShell>
  );
}