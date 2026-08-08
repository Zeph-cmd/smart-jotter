import type {
  Flashcard,
  Note,
  QuizQuestion,
  RelatedNote,
  ReviewPerformance,
  SuggestionAction
} from "@/types/note";

type ApiErrorResponse = {
  error?: string;
};

type NotesResponse = ApiErrorResponse & {
  notes?: Note[];
};

type CreateNoteResponse = ApiErrorResponse & {
  note?: Note;
};

type AskNotesResponse = ApiErrorResponse & {
  answer?: string;
  notes?: Note[];
};

type NoteResponse = ApiErrorResponse & {
  note?: Note | null;
};

type RelatedNotesResponse = ApiErrorResponse & {
  notes?: RelatedNote[];
};

type SuggestionResponse = ApiErrorResponse & {
  suggestion?: string;
};

type FlashcardsResponse = ApiErrorResponse & {
  flashcards?: Flashcard[];
};

type QuizResponse = ApiErrorResponse & {
  note_title?: string;
  questions?: QuizQuestion[];
};

type DueReviewResponse = ApiErrorResponse & {
  due_count?: number;
  flashcards?: Flashcard[];
};

type TranscriptionResponse = ApiErrorResponse & {
  text?: string;
};

export async function fetchNotes() {
  const data = await apiRequest<NotesResponse>("/api/notes", {
    errorMessages: {
      default: "Could not load your notes.",
      unauthorized: "Please sign in to load your notes."
    }
  });

  return data.notes ?? [];
}

export async function createNoteRequest(payload: {
  content: string;
  title: string;
}) {
  const data = await apiRequest<CreateNoteResponse>("/api/notes", {
    body: payload,
    errorMessages: {
      default: "Could not create your note.",
      unauthorized: "Please sign in to create notes."
    },
    method: "POST"
  });

  if (!data.note) {
    throw new Error("Could not create your note.");
  }

  return data.note;
}

export async function fetchNoteRequest(id: string) {
  const data = await apiRequest<NoteResponse>(`/api/notes/${id}`, {
    errorMessages: {
      default: "Could not load that note.",
      unauthorized: "Please sign in to view this note."
    }
  });

  if (!data.note) {
    throw new Error("Note not found.");
  }

  return data.note;
}

export async function updateNoteRequest(
  id: string,
  payload: {
    content: string;
    title: string;
  }
) {
  const data = await apiRequest<NoteResponse>(`/api/notes/${id}`, {
    body: payload,
    errorMessages: {
      default: "Could not save your note.",
      unauthorized: "Please sign in to edit notes."
    },
    method: "PATCH"
  });

  if (!data.note) {
    throw new Error("Could not save your note.");
  }

  return data.note;
}

export async function searchNotesRequest(query: string) {
  const data = await apiRequest<NotesResponse>(
    `/api/search?query=${encodeURIComponent(query)}`,
    {
      errorMessages: {
        default: "Could not search your notes.",
        unauthorized: "Please sign in to search notes."
      }
    }
  );

  return data.notes ?? [];
}

export async function askNotesRequest(question: string) {
  const data = await apiRequest<AskNotesResponse>("/api/ask", {
    body: { question },
    errorMessages: {
      default: "Could not answer from your notes.",
      unauthorized: "Please sign in to ask your notes."
    },
    method: "POST",
    retries: 1
  });

  if (!data.answer) {
    throw new Error("Could not answer from your notes.");
  }

  return {
    answer: data.answer,
    notes: data.notes ?? []
  };
}

export async function fetchRelatedNotesRequest(id: string) {
  const data = await apiRequest<RelatedNotesResponse>(`/api/notes/${id}/related`, {
    errorMessages: {
      default: "Could not load related notes.",
      unauthorized: "Please sign in to view related notes."
    }
  });

  return data.notes ?? [];
}

export async function requestSuggestion(payload: {
  action: SuggestionAction;
  content: string;
}) {
  const data = await apiRequest<SuggestionResponse>("/api/ai/suggest", {
    body: payload,
    errorMessages: {
      default: "Could not generate a suggestion right now.",
      unauthorized: "Please sign in to use writing assistance."
    },
    method: "POST",
    retries: 1
  });

  if (!data.suggestion) {
    throw new Error("Could not generate a suggestion right now.");
  }

  return data.suggestion;
}

export async function fetchFlashcardsRequest(noteId: string) {
  const data = await apiRequest<FlashcardsResponse>(
    `/api/flashcards?note_id=${encodeURIComponent(noteId)}`,
    {
      errorMessages: {
        default: "Could not load flashcards.",
        unauthorized: "Please sign in to review flashcards."
      }
    }
  );

  return data.flashcards ?? [];
}

export async function generateFlashcardsRequest(noteId: string) {
  const data = await apiRequest<FlashcardsResponse>("/api/flashcards/generate", {
    body: { note_id: noteId },
    errorMessages: {
      default: "Could not generate flashcards right now.",
      unauthorized: "Please sign in to generate flashcards."
    },
    method: "POST",
    retries: 1
  });

  return data.flashcards ?? [];
}

export async function reviewFlashcardRequest(payload: {
  flashcard_id: string;
  performance: ReviewPerformance;
}) {
  const data = await apiRequest<{ flashcard?: Flashcard } & ApiErrorResponse>(
    "/api/flashcards/review",
    {
      body: payload,
      errorMessages: {
        default: "Could not update that flashcard review.",
        unauthorized: "Please sign in to review flashcards."
      },
      method: "POST"
    }
  );

  if (!data.flashcard) {
    throw new Error("Could not update that flashcard review.");
  }

  return data.flashcard;
}

export async function fetchQuizRequest(noteId: string) {
  const data = await apiRequest<QuizResponse>(
    `/api/quiz?note_id=${encodeURIComponent(noteId)}`,
    {
      errorMessages: {
        default: "Could not load that quiz.",
        unauthorized: "Please sign in to use quiz mode."
      }
    }
  );

  return {
    noteTitle: data.note_title ?? "This note",
    questions: data.questions ?? []
  };
}

export async function fetchDueReviewsRequest() {
  const data = await apiRequest<DueReviewResponse>("/api/review/due", {
    errorMessages: {
      default: "Could not load due reviews.",
      unauthorized: "Please sign in to review your cards."
    }
  });

  return {
    dueCount: data.due_count ?? 0,
    flashcards: data.flashcards ?? []
  };
}

export async function transcribeAudioRequest(
  audio: Blob | File,
  durationSeconds = 0
) {
  const formData = new FormData();
  const filename = audio instanceof File ? audio.name : "voice-note.webm";

  formData.append("file", audio, filename);

  if (durationSeconds > 0) {
    formData.append("durationSeconds", String(durationSeconds));
  }

  const response = await fetch("/api/ai/transcribe", {
    method: "POST",
    body: formData,
    cache: "no-store"
  });

  const data = (await response.json()) as TranscriptionResponse;

  if (!response.ok) {
    const message =
      response.status === 401
        ? "Please sign in to transcribe audio."
        : response.status === 402
          ? data.error ?? "Audio limit reached. Please upgrade to continue."
          : data.error ?? "Could not transcribe audio right now.";
    throw new Error(message);
  }

  if (!data.text?.trim()) {
    throw new Error("Transcription returned no text.");
  }

  return data.text;
}

type ApiRequestOptions = {
  body?: unknown;
  errorMessages?: {
    default: string;
    unauthorized?: string;
    /** Message used when the API returns 402 Payment Required (credits/quota exhausted). */
    paymentRequired?: string;
  };
  method?: "GET" | "POST" | "PATCH";
  retries?: number;
};

/**
 * Error thrown by `apiRequest`. Carries the HTTP `status` so callers can react
 * to specific codes — in particular 402 (credits/quota exhausted), which should
 * open the subscription/MoMo prompt instead of showing a plain text message.
 */
export class ApiRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

async function apiRequest<TResponse>(
  input: string,
  options: ApiRequestOptions = {}
): Promise<TResponse> {
  const retries = options.retries ?? 0;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(input, {
      method: options.method ?? "GET",
      headers: options.body
        ? {
            "Content-Type": "application/json"
          }
        : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });

    const data = (await response.json()) as TResponse & ApiErrorResponse;

    if (response.ok) {
      return data;
    }

    if (response.status >= 500 && attempt < retries) {
      await delay(350 * (attempt + 1));
      continue;
    }

    const friendlyMessage =
      response.status === 401
        ? options.errorMessages?.unauthorized ?? "Please sign in to continue."
        : response.status === 402
          ? options.errorMessages?.paymentRequired ??
            data.error ??
            "You've used all your credits. Upgrade to continue."
          : data.error ?? options.errorMessages?.default ?? "Request failed.";

    throw new ApiRequestError(friendlyMessage, response.status);
  }

  throw new ApiRequestError(
    options.errorMessages?.default ?? "Request failed."
  );
}

function delay(durationMs: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}
