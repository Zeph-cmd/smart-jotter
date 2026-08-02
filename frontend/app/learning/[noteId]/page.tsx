import { LearningPage } from "@/components/learning/learning-page";

type LearningRouteProps = {
  params: Promise<{
    noteId: string;
  }>;
};

export default async function NoteLearningPage({ params }: LearningRouteProps) {
  const { noteId } = await params;

  return <LearningPage noteId={noteId} />;
}
