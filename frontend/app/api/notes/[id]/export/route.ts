import { getNoteById } from "@/lib/notes-service";
import { createNoteExport, parseExportFormat } from "@/lib/export/note-export";
import { requireAuthenticatedClient, requireUserId } from "@/lib/server/auth";
import { handleRouteError } from "@/lib/server/route";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = parseExportFormat(searchParams.get("format"));

  if (!format) {
    return Response.json(
      { error: "Export format must be md or txt." },
      { status: 400 }
    );
  }

  try {
    const { supabase, user } = await requireAuthenticatedClient();
    const note = await getNoteById(supabase, requireUserId(user), id);

    if (!note) {
      return Response.json({ error: "Note not found." }, { status: 404 });
    }

    const exportedNote = createNoteExport(note, format);

    return new Response(exportedNote.content, {
      headers: {
        "Content-Disposition": `attachment; filename="${exportedNote.filename}"`,
        "Content-Type": exportedNote.contentType
      }
    });
  } catch (error) {
    return handleRouteError("api-note-export", error, "Could not export that note.", {
      format,
      noteId: id
    });
  }
}
