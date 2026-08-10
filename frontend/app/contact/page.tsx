import type { Metadata } from "next";
import { ContactForm } from "@/components/ui/contact-form";
import { PageShell } from "@/components/ui/page-shell";

export const metadata: Metadata = {
  title: "Contact & Feedback · Smart Jotter",
  description:
    "Get help, report an issue, or send feedback to the Smart Jotter team."
};

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Contact & Feedback"
      subtitle="Questions, bug reports, or ideas — we'd genuinely love to hear from you."
    >
      <ContactForm />
    </PageShell>
  );
}