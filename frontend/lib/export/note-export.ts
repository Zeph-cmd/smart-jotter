import type { Note } from "@/types/note";

export type NoteExportFormat = "md" | "txt";

export function parseExportFormat(value: string | null): NoteExportFormat | null {
  return value === "md" || value === "txt" ? value : null;
}

export function createNoteExport(note: Note, format: NoteExportFormat) {
  const filename = `${slugifyTitle(note.title || "smart-jotter-note")}.${format}`;
  const content =
    format === "md"
      ? `# ${note.title}\n\n${note.content}`.trimEnd() + "\n"
      : `${note.title}\n\n${note.content}`.trimEnd() + "\n";

  return {
    content,
    contentType:
      format === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
    filename
  };
}

function slugifyTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "smart-jotter-note";
}
