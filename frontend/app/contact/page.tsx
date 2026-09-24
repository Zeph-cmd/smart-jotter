import type { Metadata } from "next";
import { ContactForm } from "@/components/ui/contact-form";
import { PageShell } from "@/components/ui/page-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Contact & Feedback · Smart Jotter",
  description:
    "Get help, report an issue, or share ideas — send feedback to the Smart Jotter team at support@smartjotter.com.",
  path: "/contact"
});

export default function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Contact & Feedback"
      subtitle="Questions, bug reports, or ideas. We'd genuinely love to hear from you."
    >
      <ContactForm />
    </PageShell>
  );
}