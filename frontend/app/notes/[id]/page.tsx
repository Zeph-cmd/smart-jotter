import { NoteEditorPage } from "@/components/editor/note-editor-page";

type NotePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function NotePage({ params }: NotePageProps) {
  const { id } = await params;

  return <NoteEditorPage noteId={id} />;
}
