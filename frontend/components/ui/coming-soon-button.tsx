"use client";

import { useState } from "react";
import { areFeaturesEnabled } from "@/lib/config/features";

type ComingSoonButtonProps = {
  /** The label shown on the button. */
  label: string;
  /** Click handler — only called when features are enabled. */
  onClick: () => void;
  /** Whether the underlying action is currently active/selected. */
  isActive?: boolean;
  /** Extra classes to merge into the default button styling. */
  className?: string;
};

/**
 * A button that respects the global FEATURES_ENABLED flag.
 *
 * When features are DISABLED (pre-launch), the button renders greyed-out and
 * shows a small "Coming soon" message on click instead of firing onClick.
 *
 * When features are ENABLED, it behaves like a normal button and calls onClick.
 */
export function ComingSoonButton({
  label,
  onClick,
  isActive = false,
  className
}: ComingSoonButtonProps) {
  const [showMessage, setShowMessage] = useState(false);

  if (areFeaturesEnabled()) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={
          className ??
          `rounded-full border px-4 py-2 text-sm font-medium transition ${
            isActive
              ? "border-accent bg-blue-50 text-accent dark:bg-blue-500/20"
              : "border-line text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          }`
        }
      >
        {label}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setShowMessage(true);
          window.setTimeout(() => setShowMessage(false), 2500);
        }}
        className="cursor-not-allowed rounded-full border border-line px-4 py-2 text-sm font-medium text-slate-400 opacity-60 transition dark:text-slate-500"
        title="Coming soon"
      >
        {label}
      </button>

      {showMessage ? (
        <div className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700">
          Coming soon
        </div>
      ) : null}
    </div>
  );
}