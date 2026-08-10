"use client";

import { AgreementScreen } from "@/components/auth/agreement-screen";
import { AuthPanel } from "@/components/auth/auth-panel";
import { NoteListSkeleton } from "@/components/note-list-skeleton";
import { NotesPage } from "@/components/notes-page";
import { useAuth } from "@/lib/auth/auth-context";

export function HomeShell() {
  const { isAgreementLoading, hasAgreedToTerms, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
            <div className="animate-pulse">
              <div className="h-4 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-5 h-10 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </section>
          <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
            <NoteListSkeleton />
          </section>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <AuthPanel />
        </div>
      </main>
    );
  }

  // Terms-agreement gate: existing users who never accepted are prompted once.
  // Show the agreement screen before notes/AI features are accessible. While we
  // resolve the agreement status, reuse the loading skeleton to avoid flashes.
  if (isAgreementLoading || hasAgreedToTerms === null) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
            <div className="animate-pulse">
              <div className="h-4 w-32 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-5 h-10 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </section>
          <section className="rounded-[32px] border border-line bg-white p-6 shadow-jotter dark:bg-slate-900 sm:p-8">
            <NoteListSkeleton />
          </section>
        </div>
      </main>
    );
  }

  if (!hasAgreedToTerms) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <AgreementScreen />
        </div>
      </main>
    );
  }

  return <NotesPage />;
}
