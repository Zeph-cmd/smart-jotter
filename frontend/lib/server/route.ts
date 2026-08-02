import { NextResponse } from "next/server";
import { logServerError, toClientErrorMessage } from "@/lib/server/errors";

export function handleRouteError(
  scope: string,
  error: unknown,
  fallbackMessage: string,
  context?: unknown
) {
  logServerError(scope, error, context);

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? ((error as { status: number }).status)
      : 500;

  return NextResponse.json(
    {
      error: toClientErrorMessage(error, fallbackMessage)
    },
    { status }
  );
}
