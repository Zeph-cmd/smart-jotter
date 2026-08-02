"use client";

/**
 * A semi-transparent overlay that greys out a card/section and shows a
 * "Coming soon" badge. Used to gate AI-powered features (semantic search,
 * ask your notes) behind the FEATURES_ENABLED flag without removing them.
 *
 * The overlay sits absolutely over the parent container, so the parent must
 * have `position: relative`.
 */
export function ComingSoonOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[32px] bg-slate-50/80 backdrop-blur-sm dark:bg-slate-900/80">
      <div className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
        Coming soon
      </div>
    </div>
  );
}