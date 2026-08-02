export function NoteListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[28px] border border-line bg-slate-50 px-5 py-5 dark:bg-slate-900"
        >
          <div className="h-5 w-1/3 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mt-3 h-3 w-1/4 rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="mt-5 space-y-2">
            <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-5/6 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-3 w-2/3 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
