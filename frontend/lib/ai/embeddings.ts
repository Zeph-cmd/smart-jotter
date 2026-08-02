import { hasOpenAIKey, openAIRequest } from "@/lib/ai/openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

type EmbeddingsResponse = {
  data: Array<{
    embedding: number[];
  }>;
};

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const trimmedText = text.trim();

  if (!trimmedText || !hasOpenAIKey()) {
    return null;
  }

  // Embeddings are generated server-side only so the API key never reaches the client.
  const response = await openAIRequest<EmbeddingsResponse>("/embeddings", {
    input: trimmedText,
    model: EMBEDDING_MODEL
  });

  return response.data[0]?.embedding ?? null;
}
