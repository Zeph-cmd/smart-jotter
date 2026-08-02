export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function toClientErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

export function logServerError(scope: string, error: unknown, context?: unknown) {
  const payload = {
    scope,
    error:
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack
          }
        : error,
    context
  };

  console.error("[smart-jotter]", JSON.stringify(payload));
}
