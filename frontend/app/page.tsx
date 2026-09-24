import { HomeShell } from "@/components/home-shell";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Smart Jotter — Minimal Notes with Real Intelligence",
  description:
    "Capture ideas quickly, search by meaning, and ask questions grounded in your own notes. AI-powered note-taking that stays out of your way."
});

export default function HomePage() {
  return <HomeShell />;
}
