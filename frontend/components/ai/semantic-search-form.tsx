"use client";

import { FormEvent } from "react";

type SemanticSearchFormProps = {
  isSearching: boolean;
  onClear: () => void;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  query: string;
};

export function SemanticSearchForm({
  isSearching,
  onClear,
  onQueryChange,
  onSearch,
  query
}: SemanticSearchFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search by concept, idea, or meaning..."
        className="w-full rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-accent focus:bg-white dark:bg-slate-950 dark:text-slate-100 dark:focus:bg-slate-900"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-blue-500"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center rounded-full border border-line px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
