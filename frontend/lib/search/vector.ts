import type { StoredEmbedding } from "@/types/note";

export function toPgVector(embedding: number[]) {
  return `[${embedding.join(",")}]`;
}

export function parseStoredEmbedding(embedding: StoredEmbedding): number[] | null {
  if (Array.isArray(embedding)) {
    return embedding.map(Number);
  }

  if (typeof embedding !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(embedding) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.map(Number);
  } catch {
    return null;
  }
}
