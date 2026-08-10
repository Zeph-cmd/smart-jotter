"use client";

import { useState } from "react";
import {
  PageList,
  PageParagraph,
  PageSectionHeading
} from "@/components/ui/page-shell";

const CONTACT_EMAIL = "support@smartjotter.com";

/**
 * Interactive contact/feedback form (client component).
 * Opens the visitor's email client with a pre-filled message — no backend
 * or auth required.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const subject = encodeURIComponent(
      `Smart Jotter feedback from ${name || "a user"}`
    );
    const body = encodeURIComponent(
      `${message}\n\n— ${name || "Anonymous"}${email ? `\nReply to: ${email}` : ""}`
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <>
      <PageSectionHeading>How to reach us</PageSectionHeading>
      <PageList
        items={[
          <>
            Email:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-slate-700 underline transition hover:text-ink dark:text-slate-200 dark:hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
          </>,
          "We typically respond within 1–2 business days.",
          "For account-specific issues, please include the email address tied to your Smart Jotter account."
        ]}
      />

      <div className="mt-8">
        <PageSectionHeading>Send feedback</PageSectionHeading>
        <PageParagraph>
          Use the form below to share a quick message. It will open your email
          app with everything filled in — no account required.
        </PageParagraph>

        {submitted ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            Thanks! Your email app should have opened with your message. If it
            didn't, email us directly at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="name"
                label="Name (optional)"
                value={name}
                onChange={setName}
                placeholder="Your name"
              />
              <Field
                id="email"
                label="Email (optional)"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                Message
              </label>
              <textarea
                id="message"
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={5}
                placeholder="What's on your mind?"
                className="mt-2 w-full resize-y rounded-2xl border border-line bg-mist/50 px-4 py-3 text-base text-ink placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-mist transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Send message
            </button>
          </form>
        )}
      </div>

      <div className="mt-8">
        <PageSectionHeading>What we'd love to know</PageSectionHeading>
        <PageList
          items={[
            "Features you wish Smart Jotter had.",
            "Anything confusing or hard to use.",
            "Bugs or unexpected behavior you ran into.",
            "How you're using the app — students, professionals, or otherwise."
          ]}
        />
      </div>
    </>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
};

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text"
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-line bg-mist/50 px-4 py-3 text-base text-ink placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
      />
    </div>
  );
}